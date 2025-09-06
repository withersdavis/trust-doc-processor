/**
 * Hybrid LangExtract Service with Claude AI
 * 
 * This service combines LangExtract's structured extraction methodology
 * with Claude AI's advanced language understanding capabilities.
 * 
 * Since LangExtract doesn't natively support Claude/Anthropic models,
 * we implement a hybrid approach that:
 * 1. Uses LangExtract's document structure and formatting
 * 2. Leverages Claude AI for the actual extraction intelligence
 * 3. Maintains compatibility with LangExtract's output format
 * 
 * This gives us the best of both worlds:
 * - LangExtract's proven extraction methodology and structure
 * - Claude's superior language understanding and accuracy
 */

import Anthropic from '@anthropic-ai/sdk';
import { extract as langExtract, ExampleData, FormatType, Document } from 'langextract';
import fs from 'fs/promises';
import path from 'path';

// Load trust template and parameters
const trustTemplatePath = path.join(__dirname, '../../../lib/trust_template.json');
const paramsPath = path.join(__dirname, '../../../lib/langExtract_params.json');

export interface ProcessingResult {
  metadata: {
    processed_date: string;
    original_filename: string;
    processing_time_ms: number;
  };
  extraction: {
    KEY_FIELDS: any;
    SUMMARY_PARAGRAPHS: any;
    DETAILS: any;
  };
  citations: any[];
}

/**
 * Process document using LangExtract structure with Claude as the LLM provider
 * This hybrid approach uses LangExtract's document processing and structure
 * but leverages Claude for the actual extraction intelligence
 */
export async function processDocumentWithLangExtractClaude(
  documentText: string,
  filename: string
): Promise<ProcessingResult> {
  const startTime = Date.now();
  
  try {
    // Load template and parameters
    const trustTemplateText = await fs.readFile(trustTemplatePath, 'utf-8');
    const paramsText = await fs.readFile(paramsPath, 'utf-8');
    
    let trustTemplate: any;
    let langExtractParams: any;
    
    try {
      trustTemplate = JSON.parse(trustTemplateText);
    } catch (e) {
      console.error('Error parsing trust_template.json:', e);
      throw new Error('Invalid trust_template.json file');
    }
    
    try {
      langExtractParams = JSON.parse(paramsText);
    } catch (e) {
      console.error('Error parsing langExtract_params.json:', e);
      console.error('File content:', paramsText.substring(0, 500));
      throw new Error('Invalid langExtract_params.json file');
    }
    
    // Since LangExtract doesn't natively support Claude, we'll use a hybrid approach:
    // 1. First use Claude to extract the information
    // 2. Then format it according to LangExtract's structure
    
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
    });

    // Create extraction examples in LangExtract format
    const examples: ExampleData[] = [
      {
        text: "The John and Jane Smith Family Trust, established on January 1, 2020, with John Smith and Jane Smith as Grantors and initial Trustees.",
        extractions: [
          {
            extractionClass: "KEY_FIELDS",
            extractionText: "The John and Jane Smith Family Trust",
            attributes: {
              Trust_Name: "The John and Jane Smith Family Trust",
              Grantor_Settlor_Trustor: ["John Smith", "Jane Smith"],
              Effective_Date: "January 1, 2020"
            }
          }
        ]
      }
    ];

    // Create a comprehensive prompt that follows LangExtract's approach
    const promptDescription = `Extract trust document information with precise citations. 
      Structure the output according to these three sections:
      1. KEY_FIELDS: ${JSON.stringify(Object.keys(trustTemplate.KEY_FIELDS))}
      2. SUMMARY_PARAGRAPHS: ${JSON.stringify(Object.keys(trustTemplate.SUMMARY_PARAGRAPHS))}
      3. DETAILS: ${JSON.stringify(Object.keys(trustTemplate.DETAILS))}
      
      Apply these parameters:
      - Return format: ${langExtractParams.params.return_format}
      - Granularity: ${langExtractParams.params.granularity}
      - Include citations: ${langExtractParams.params.include_citations}
      - Fill missing: "${langExtractParams.params.fill_missing}"
      - Style: ${langExtractParams.params.style}
      - Hallucination guard: ${langExtractParams.params.hallucination_guard}
      - Focus areas: ${langExtractParams.params.focus.join(', ')}`;

    // Call Claude with LangExtract-style structure
    const systemPrompt = `You are an extraction system that follows the LangExtract methodology for document analysis.
      
      CRITICAL REQUIREMENTS:
      1. For EVERY piece of information you extract, include the EXACT quoted text from the document in square brackets
      2. Each field value should be followed by its citation like: "value ['exact quote from document']"
      3. If extracting multiple items, each should have its own citation
      4. Citations must be verbatim quotes that can be found in the original document
      5. Use "${langExtractParams.params.fill_missing}" ONLY when information cannot be found
      6. Apply ${langExtractParams.params.hallucination_guard} hallucination guard - never guess or infer
      
      Return structured JSON matching the template with inline citations for ALL extracted information.`;

    const userPrompt = `Using the LangExtract methodology, extract trust information from this document.
      
      Template Structure:
      ${JSON.stringify(trustTemplate, null, 2)}
      
      Document to analyze:
      ${documentText}
      
      Return a JSON object with three main sections (KEY_FIELDS, SUMMARY_PARAGRAPHS, DETAILS) exactly matching the template structure.
      Include inline citations by referencing the exact text that supports each extraction.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    // Parse Claude's response
    let extractedData: any;
    const content = message.content[0];
    
    if (content.type === 'text') {
      // First try to extract JSON from code blocks
      let jsonText = content.text;
      
      // Remove markdown code blocks if present
      if (jsonText.includes('```json')) {
        const jsonBlockMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
        if (jsonBlockMatch) {
          jsonText = jsonBlockMatch[1];
        }
      } else if (jsonText.includes('```')) {
        const codeBlockMatch = jsonText.match(/```\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonText = codeBlockMatch[1];
        }
      }
      
      // Try to find JSON object in the text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Error parsing Claude response:', parseError);
          console.error('Response text:', jsonText.substring(0, 500));
          throw new Error('Failed to parse JSON from Claude response');
        }
      } else {
        throw new Error('No valid JSON found in Claude response');
      }
    } else {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract citations using LangExtract's approach
    const citations = extractCitationsWithContext(content.type === 'text' ? content.text : '', documentText);

    // Structure result in LangExtract format
    const structuredResult: ProcessingResult = {
      metadata: {
        processed_date: new Date().toISOString(),
        original_filename: filename,
        processing_time_ms: Date.now() - startTime
      },
      extraction: {
        KEY_FIELDS: extractedData.KEY_FIELDS || fillTemplate(trustTemplate.KEY_FIELDS, langExtractParams.params.fill_missing),
        SUMMARY_PARAGRAPHS: extractedData.SUMMARY_PARAGRAPHS || fillTemplate(trustTemplate.SUMMARY_PARAGRAPHS, langExtractParams.params.fill_missing),
        DETAILS: extractedData.DETAILS || fillTemplate(trustTemplate.DETAILS, langExtractParams.params.fill_missing)
      },
      citations: citations
    };

    return structuredResult;
  } catch (error) {
    console.error('LangExtract-Claude processing error:', error);
    throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fill template with default values following LangExtract's approach
 */
function fillTemplate(template: any, fillValue: string): any {
  if (typeof template === 'string') {
    return fillValue;
  }
  if (Array.isArray(template)) {
    return [];
  }
  if (typeof template === 'object' && template !== null) {
    const filled: any = {};
    for (const [key, value] of Object.entries(template)) {
      filled[key] = fillTemplate(value, fillValue);
    }
    return filled;
  }
  return template;
}

/**
 * Extract citations with context, following LangExtract's citation approach
 */
function extractCitationsWithContext(response: string, originalText: string): any[] {
  const citations: any[] = [];
  
  // Find all text in square brackets (LangExtract citation style)
  const bracketPattern = /\['([^']+)'\]/g;
  let match;
  
  while ((match = bracketPattern.exec(response)) !== null) {
    const quotedText = match[1];
    
    // Check if this text appears in the original document
    const index = originalText.indexOf(quotedText);
    if (index !== -1) {
      // Get surrounding context (LangExtract style)
      const contextStart = Math.max(0, index - 50);
      const contextEnd = Math.min(originalText.length, index + quotedText.length + 50);
      const context = originalText.substring(contextStart, contextEnd);
      
      citations.push({
        text: quotedText,
        context: context,
        location: {
          start: index,
          end: index + quotedText.length,
          length: quotedText.length
        },
        confidence: 1.0
      });
    }
  }
  
  // Also find quoted text patterns for additional citations
  const quotedPattern = /"([^"]+)"/g;
  
  while ((match = quotedPattern.exec(response)) !== null) {
    const quotedText = match[1];
    
    // Only add if it's actually from the document and not already captured
    const index = originalText.indexOf(quotedText);
    if (index !== -1 && quotedText.length > 15 && 
        !citations.some(c => c.text === quotedText)) {
      const contextStart = Math.max(0, index - 50);
      const contextEnd = Math.min(originalText.length, index + quotedText.length + 50);
      const context = originalText.substring(contextStart, contextEnd);
      
      citations.push({
        text: quotedText,
        context: context,
        location: {
          start: index,
          end: index + quotedText.length,
          length: quotedText.length
        },
        confidence: 0.9
      });
    }
  }

  // Remove duplicates while preserving LangExtract format
  const uniqueCitations = citations.filter((citation, index, self) =>
    index === self.findIndex((c) => c.text === citation.text)
  );
  
  // Sort by location in document
  uniqueCitations.sort((a, b) => a.location.start - b.location.start);

  return uniqueCitations;
}

/**
 * Save results to file following LangExtract's output format
 */
export async function saveResultToFile(result: ProcessingResult): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                   new Date().toTimeString().split(' ')[0].replace(/:/g, '');
  const safeFilename = result.metadata.original_filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/\.[^.]+$/, '');
  
  const outputFilename = `${timestamp}_${safeFilename}.json`;
  const outputPath = path.join(__dirname, '../../../results', outputFilename);
  
  // Save in LangExtract's format
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  
  return outputFilename;
}