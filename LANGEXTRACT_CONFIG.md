# LangExtract Configuration & Customizations

## Overview
This document outlines all LangExtract rules, parameters, and customizations used in the S3 Trust Document Processing Application.

## Core Configuration Files

### 1. Template Structure
**File:** [`/lib/trust_template_new.json`](lib/trust_template_new.json)

The template defines three main sections for extraction:
- **Basic_Information**: Trust name, type, dates, parties (grantors, trustees, beneficiaries)
- **Summary**: Purpose, how it works, distribution provisions, trustee powers, amendments
- **Details**: Tax ID, state formation, advisors, provisions (spendthrift, no-contest)

### 2. Few-Shot Examples
**File:** [`/lib/langextract_few_shot_examples.json`](lib/langextract_few_shot_examples.json)

Contains 10 detailed examples that teach LangExtract how to:
- Identify primary vs secondary trust names
- Extract grantors/settlors correctly
- Summarize distribution rules
- Identify successor trustees in order
- Extract effective dates with cross-referencing
- Understand trust purpose and operation
- Identify trustees and beneficiaries

Key examples include:
1. **Trust Name Disambiguation** - Shows how to identify "JERRY SIMONS 2012 TRUST" as primary, not "Descendant's Separate Trust"
2. **Grantor Identification** - Identifies CARL HUNTINGTON as Settlor/Grantor
3. **Distribution Rules** - Complex summaries of what happens on grantor's death
4. **Successor Trustees** - Ordered list extraction (CARA KOSS, then STEPHEN W. PORTER)

### 3. Parameters Configuration
**File:** [`/lib/langExtract_params.json`](lib/langExtract_params.json)

Defines extraction parameters (note: most are overridden in code):
```json
{
  "temperature": 0.1,
  "fill_missing": {
    "enabled": true,
    "default_value": "Not specified"
  }
}
```

## Python Implementation
**File:** [`/python/langextract_service.py`](python/langextract_service.py)

### LangExtract Call Parameters (Lines 182-193)
```python
result = lx.extract(
    document_text,
    examples=examples,
    model_id="gemini-2.5-flash",     # Fast Gemini model
    temperature=0.1,                  # Low temperature for consistency
    extraction_passes=3,              # Multiple passes for better recall
    max_workers=10,                   # Parallel processing for speed
    batch_length=10,                  # Batch size matches workers
    max_char_buffer=4000              # Chunk size for accuracy
)
```

### Key Customizations

#### 1. DNS Pre-Resolution (Lines 17-22)
Prevents DNS resolution errors in parallel processing:
```python
def pre_resolve_dns():
    try:
        socket.gethostbyname('generativelanguage.googleapis.com')
    except:
        pass
```

#### 2. Example Creation from Few-Shot (Lines 56-157)
Converts JSON examples to LangExtract format:
- Handles both dictionary and string output formats
- Maps instructions to appropriate extraction classes
- Creates `lx.data.ExampleData` objects with extractions

#### 3. Template-Based Mapping (Lines 242-358)
Maps extraction classes to template structure:
- Normalizes class names (lowercase, remove underscores)
- Routes to correct section (Basic_Information, Summary, Details)
- Handles list fields (Trustees, Beneficiaries) vs single values
- Special handling for yes/no fields (Spendthrift_Provision, No-Contest_Clause)

#### 4. Missing Field Handling (Lines 360-387)
Fills empty fields with appropriate defaults:
- List fields → empty array `[]`
- Yes/no fields → `"no"`
- Other fields → `"Not specified"`
- Other_Provisions → empty object `{}`

## Node.js Integration
**File:** [`/server/src/services/standardLangExtractService.ts`](server/src/services/standardLangExtractService.ts)

### Process Flow
1. Spawns Python process with document text and API key (Lines 58-63)
2. Handles both old and new template structures (Lines 95-108)
3. Saves results to `/results` folder with timestamp

### Result Structure
```typescript
interface ProcessingResult {
  metadata: {
    processed_date: string;
    original_filename: string;
    processing_time_ms: number;
  };
  extraction: {
    Basic_Information: any;
    Summary: any;
    Details: any;
  };
  citations: any[];
}
```

## Frontend Display
**File:** [`/client/src/components/ResultsDisplay.tsx`](client/src/components/ResultsDisplay.tsx)

Supports both template structures:
- Old: KEY_FIELDS, SUMMARY_PARAGRAPHS, DETAILS
- New: Basic_Information, Summary, Details

Displays citations with:
- Citation key
- Full text
- Location (start/end positions)

## Environment Configuration
**File:** [`/server/.env`](server/.env)

```env
GEMINI_API_KEY=AIzaSyCLCKkUgybxX9d0PlM8-QhNvFf1-BjhC4U
```

## Optimization Strategies

### Speed Optimizations
1. **Model Selection**: Using `gemini-2.5-flash` (faster than gemini-1.5-flash)
2. **Parallel Processing**: `max_workers=10` for concurrent API calls
3. **Batch Processing**: `batch_length=10` matching workers
4. **Chunk Size**: `max_char_buffer=4000` balances accuracy vs API calls

### Quality Optimizations
1. **Low Temperature**: `0.1` for consistent extractions
2. **Multiple Passes**: `extraction_passes=3` improves recall
3. **Few-Shot Examples**: 10 detailed examples guide extraction
4. **Template Structure**: Clear hierarchy for organized output

### Stability Measures
1. **DNS Pre-resolution**: Prevents resolution failures
2. **Error Handling**: Graceful fallbacks for missing data
3. **Type Flexibility**: Handles both dict and string formats in examples

## Common Extraction Patterns

### Trust Name Identification
- Primary trust name from document header
- Distinguishes from secondary/contingent trusts
- Example: "JERRY SIMONS 2012 TRUST" not "Descendant's Separate Trust"

### Party Identification
- **Grantor/Settlor/Trustor**: Person creating the trust
- **Trustee**: Initial administrator
- **Successor Trustees**: Ordered list of backups
- **Beneficiaries**: Primary and contingent recipients

### Date Extraction
- Cross-references "effective the day and year first above written"
- Formats dates consistently (e.g., "May 30, 2012")

### Distribution Rules
- Summarizes complex legal language into clear bullets
- Identifies restrictions (e.g., self-dealing prevention)
- Explains automatic vs discretionary distributions

## Processing Times
With current settings (10 workers, 3 passes, 4000 char buffer):
- Small document (3-5KB): ~30-60 seconds
- Medium document (50-100KB): ~60-120 seconds
- Large document (100KB+): ~2-3 minutes

## Known Issues & Mitigations

### DNS Resolution Errors
- **Issue**: "nodename nor servname provided" errors
- **Mitigation**: DNS pre-resolution, reduced parallelism if needed

### Type Mismatches
- **Issue**: "expected str instance, dict found"
- **Mitigation**: Flexible handling of both formats in example processing

### Missing Extractions
- **Issue**: Some fields not extracted
- **Mitigation**: Multiple extraction passes, comprehensive few-shot examples

## Testing

### Test Document
**File:** [`/test_trust.txt`](test_trust.txt)
- Simple trust document for testing
- Contains: JERRY SIMONS 2012 TRUST
- Trustees: JERRY SIMONS, then MARY SIMONS, then FIRST NATIONAL BANK

### Test Commands
```bash
# Direct Python test
cat test_trust.txt | python3 -c "import json, sys; print(json.dumps({'document_text': sys.stdin.read(), 'api_key': 'YOUR_KEY'}))" | python python/langextract_service.py

# API test
curl -X POST -F "file=@test_trust.txt" http://localhost:3001/api/upload
curl -X POST http://localhost:3001/api/process/FILE_ID
```

## Future Improvements

1. **Custom Instructions**: Pass specific extraction instructions per document
2. **Confidence Scores**: Add confidence metrics to extractions
3. **Caching**: Cache examples to reduce initialization time
4. **Retry Logic**: Automatic retry on transient failures
5. **Progress Tracking**: Real-time progress updates during extraction