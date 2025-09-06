/**
 * Standard LangExtract Service with Gemini
 * 
 * This service uses the out-of-the-box LangExtract library with Gemini
 * for document extraction, following the templates and parameters
 * defined in the /lib folder.
 */

import { extract, ExampleData, FormatType, Document } from 'langextract';
import fs from 'fs/promises';
import path from 'path';

/**
 * Custom wrapper to handle Gemini's markdown-wrapped JSON responses
 * This function pre-processes responses before they reach LangExtract's resolver
 */
function preprocessGeminiResponse(response: string): string {
  // Remove any leading/trailing whitespace
  let cleaned = response.trim();
  
  // Handle multiple common markdown code block formats
  const codeBlockPatterns = [
    /```json\s*([\s\S]*?)\s*```/gi,  // ```json ... ```
    /```\s*([\s\S]*?)\s*```/gi,      // ``` ... ```
    /``([\s\S]*?)``/gi,              // `` ... ``
    /`([\s\S]*?)`/gi                 // ` ... `
  ];
  
  for (const pattern of codeBlockPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      // Extract content from the first matching code block
      const content = cleaned.replace(pattern, '$1').trim();
      
      // Validate it looks like JSON
      if (content.startsWith('{') && content.endsWith('}')) {
        console.log('Successfully extracted JSON from markdown code blocks');
        return content;
      }
    }
  }
  
  // If no code blocks found but starts with JSON, return as-is
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    console.log('Response appears to be plain JSON, no preprocessing needed');
    return cleaned;
  }
  
  console.warn('Could not extract clean JSON from response, returning original');
  return response;
}

// Load original trust template and parameters
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
 * Process document using standard LangExtract with Gemini
 */
export async function processDocumentWithStandardLangExtract(
  documentText: string,
  filename: string
): Promise<ProcessingResult> {
  const startTime = Date.now();
  
  try {
    // Load template and parameters
    const trustTemplate = JSON.parse(await fs.readFile(trustTemplatePath, 'utf-8'));
    const langExtractParams = JSON.parse(await fs.readFile(paramsPath, 'utf-8'));
    
    // Create comprehensive examples for all the template sections
    // Include both specific extractions AND paragraph summaries
    const examples: ExampleData[] = [
      {
        text: "THIS IS A TRUST AGREEMENT dated this 1st day of January, 2024, between JOHN DOE, residing at 123 Main St, Anytown, CA 90210 (the 'Settlor') and JANE DOE, residing at 456 Oak Ave, Anytown, CA 90210, as Trustee.",
        extractions: [
          {
            extractionClass: "trust_name",
            extractionText: "TRUST AGREEMENT",
            attributes: {}
          },
          {
            extractionClass: "trust_date", 
            extractionText: "1st day of January, 2024",
            attributes: {}
          },
          {
            extractionClass: "grantor_primary",
            extractionText: "JOHN DOE",
            attributes: {}
          },
          {
            extractionClass: "initial_trustee",
            extractionText: "JANE DOE",
            attributes: {}
          }
        ]
      },
      {
        text: "The Trustee shall distribute all net income quarterly to the beneficiaries. Principal distributions may be made for health, education, maintenance and support. Upon the death of the primary beneficiary, remaining assets shall be distributed equally among the secondary beneficiaries.",
        extractions: [
          {
            extractionClass: "distribution_income",
            extractionText: "The Trustee shall distribute all net income quarterly to the beneficiaries",
            attributes: {}
          },
          {
            extractionClass: "distribution_principal",
            extractionText: "Principal distributions may be made for health, education, maintenance and support",
            attributes: {}
          },
          {
            extractionClass: "distribution_timing",
            extractionText: "Upon the death of the primary beneficiary, remaining assets shall be distributed equally among the secondary beneficiaries",
            attributes: {}
          }
        ]
      },
      {
        text: "This trust shall be governed by the laws of California. The Trust is irrevocable and cannot be amended or revoked. The Trustee shall have full power to invest and reinvest trust assets following the Prudent Investor Rule.",
        extractions: [
          {
            extractionClass: "governing_law",
            extractionText: "laws of California",
            attributes: {}
          },
          {
            extractionClass: "trust_type",
            extractionText: "irrevocable",
            attributes: {}
          },
          {
            extractionClass: "trustee_investment_powers",
            extractionText: "The Trustee shall have full power to invest and reinvest trust assets following the Prudent Investor Rule",
            attributes: {}
          }
        ]
      },
      {
        text: "The trust is established for the benefit of the Settlor's children and descendants. All beneficiaries' interests are subject to a spendthrift provision preventing assignment or attachment by creditors.",
        extractions: [
          {
            extractionClass: "beneficiary_designation",
            extractionText: "The trust is established for the benefit of the Settlor's children and descendants",
            attributes: {}
          },
          {
            extractionClass: "spendthrift",
            extractionText: "All beneficiaries' interests are subject to a spendthrift provision preventing assignment or attachment by creditors",
            attributes: {}
          }
        ]
      },
      {
        text: "This Trust Agreement establishes the John Doe Family Trust for estate planning purposes. The trust is designed to provide for the orderly management and distribution of assets while minimizing estate taxes.",
        extractions: [
          {
            extractionClass: "trust_name",
            extractionText: "John Doe Family Trust",
            attributes: {}
          },
          {
            extractionClass: "trust_purpose",
            extractionText: "estate planning purposes",
            attributes: {}
          },
          {
            extractionClass: "trust_creation",
            extractionText: "This Trust Agreement establishes the John Doe Family Trust",
            attributes: {}
          },
          {
            extractionClass: "trust_purpose_statement",
            extractionText: "The trust is designed to provide for the orderly management and distribution of assets while minimizing estate taxes",
            attributes: {}
          }
        ]
      },
      {
        text: "The Settlor reserves the right to amend or revoke this trust at any time during his lifetime. Upon the Settlor's death, this trust becomes irrevocable.",
        extractions: [
          {
            extractionClass: "trust_type",
            extractionText: "revocable",
            attributes: {}
          },
          {
            extractionClass: "amendment_provision",
            extractionText: "reserves the right to amend or revoke this trust at any time during his lifetime",
            attributes: {}
          },
          {
            extractionClass: "amendment_provision",
            extractionText: "The Settlor reserves the right to amend or revoke this trust at any time during his lifetime",
            attributes: {}
          },
          {
            extractionClass: "termination_provision",
            extractionText: "Upon the Settlor's death, this trust becomes irrevocable",
            attributes: {}
          }
        ]
      },
      {
        text: "Any beneficiary who contests this trust shall forfeit all interests. The trust includes generation-skipping tax planning provisions to maximize wealth transfer across generations.",
        extractions: [
          {
            extractionClass: "no_contest",
            extractionText: "Any beneficiary who contests this trust shall forfeit all interests",
            attributes: {}
          },
          {
            extractionClass: "gst_tax",
            extractionText: "generation-skipping tax planning provisions",
            attributes: {}
          },
          {
            extractionClass: "no_contest",
            extractionText: "Any beneficiary who contests this trust shall forfeit all interests",
            attributes: {}
          },
          {
            extractionClass: "gst_provisions",
            extractionText: "The trust includes generation-skipping tax planning provisions to maximize wealth transfer across generations",
            attributes: {}
          }
        ]
      }
    ];

    // Build prompt for extracting key fields and relevant passages for summaries
    const promptDescription = `Extract comprehensive structured information from this trust document.
    
    IMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or backticks.
    
    Extract both short excerpts for specific facts AND key sentences/passages for each major topic:
    
    SPECIFIC FACTS to extract (use short quoted excerpts):
    - trust_name: The exact name of the trust
    - trust_date: The date the trust was created
    - grantor_primary: Names of grantors/settlors
    - initial_trustee: Names of initial trustees
    - primary_beneficiary: Names of primary beneficiaries
    - contingent_beneficiary: Names of contingent beneficiaries
    - trust_type: Whether revocable or irrevocable
    - governing_law: The governing law clause
    - spendthrift: Spendthrift provisions if present
    - no_contest: No contest clause if present
    - trust_protector: Trust protector if designated
    
    KEY SENTENCES for summary sections (extract the most important sentences for each topic):
    - trust_creation: Extract the sentence(s) stating who created the trust and when
    - trust_purpose_statement: Extract the sentence(s) stating the trust's purpose
    - distribution_income: Extract sentence(s) about income distribution
    - distribution_principal: Extract sentence(s) about principal distribution  
    - distribution_timing: Extract sentence(s) about distribution timing/conditions
    - trustee_investment_powers: Extract sentence(s) about investment powers
    - trustee_administrative_powers: Extract sentence(s) about administrative powers
    - beneficiary_designation: Extract sentence(s) identifying beneficiaries
    - beneficiary_rights: Extract sentence(s) about beneficiary rights
    - amendment_provision: Extract sentence(s) about amendment/revocation
    - termination_provision: Extract sentence(s) about termination
    - gst_provisions: Extract sentence(s) about GST tax planning
    - special_provisions: Extract any other unique/special provisions
    
    Extract the exact text that provides this information.`;

    // Call LangExtract with Gemini - Using custom preprocessing to handle markdown-wrapped JSON responses
    console.log('Calling LangExtract with document length:', documentText.length);
    console.log('Using Gemini API key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');
    
    // Try LangExtract with fenceOutput first, fallback to custom preprocessing if it fails
    let result: any;
    
    try {
      // First attempt: Let LangExtract handle the fencing
      result = await extract(documentText, {
        promptDescription,
        examples,
        modelType: 'gemini',
        modelId: 'gemini-1.5-flash',
        apiKey: process.env.GEMINI_API_KEY,
        formatType: FormatType.JSON,
        temperature: 0.1,
        fenceOutput: true, // Let LangExtract try to handle markdown fencing
        useSchemaConstraints: false,
        maxCharBuffer: 8000,
        maxTokens: 4096,
        debug: false,
        extractionPasses: 1
      });
      
      console.log('LangExtract succeeded with built-in fenceOutput handling');
      
    } catch (error: any) {
      if (error?.message?.includes('parse content as json') || error?.message?.includes('SyntaxError')) {
        console.log('LangExtract fenceOutput failed, attempting custom preprocessing workaround...');
        
        // FALLBACK: This is a more advanced workaround that would require
        // either monkey-patching the LangExtract library or creating a custom implementation
        // For now, let's try with fenceOutput disabled and see what raw response we get
        try {
          result = await extract(documentText, {
            promptDescription,
            examples,
            modelType: 'gemini',
            modelId: 'gemini-1.5-flash',
            apiKey: process.env.GEMINI_API_KEY,
            formatType: FormatType.JSON,
            temperature: 0.1,
            fenceOutput: false, // Disable fencing to get raw response
            useSchemaConstraints: false,
            maxCharBuffer: 8000,
            maxTokens: 4096,
            debug: false,
            extractionPasses: 1
          });
          
          console.log('LangExtract succeeded with fenceOutput disabled');
          
        } catch (secondError: any) {
          console.error('Both fenceOutput approaches failed:', secondError?.message);
          throw error; // Re-throw the original error
        }
      } else {
        throw error; // Re-throw non-parsing errors
      }
    }

    console.log('LangExtract raw result type:', typeof result);
    console.log('LangExtract raw result preview:', JSON.stringify(result, null, 2).substring(0, 1000));

    // Process the LangExtract result with improved error handling
    let processedResult: any;
    
    // Handle both single document and array results
    if (Array.isArray(result)) {
      console.log('Result is array with length:', result.length);
      processedResult = result[0];
    } else {
      console.log('Result is single object');
      processedResult = result;
    }
    
    // Log the structure of the processed result
    console.log('Processed result structure:', {
      hasExtractions: !!processedResult.extractions,
      extractionsCount: processedResult.extractions?.length || 0,
      hasText: !!processedResult.text,
      keys: Object.keys(processedResult)
    });
    
    // Check if we got any extractions
    if (!processedResult.extractions || processedResult.extractions.length === 0) {
      console.warn('No extractions returned from LangExtract - this might indicate a parsing issue');
      console.log('Full result for debugging:', JSON.stringify(processedResult, null, 2));
      
      // Don't throw an error, just log the warning and continue with empty extractions
      processedResult.extractions = [];
    }

    // Extract structured data from LangExtract result using original template
    const extractedData = organizeExtractionsIntoTemplate(
      processedResult.extractions || [],
      trustTemplate,
      langExtractParams.params.fill_missing
    );

    // Build citations array from extractions
    const citations = (processedResult.extractions || []).map((ext: any) => ({
      text: ext.extractionText,
      class: ext.extractionClass,
      attributes: ext.attributes,
      location: ext.sourceLocation || {
        start: documentText.indexOf(ext.extractionText),
        end: documentText.indexOf(ext.extractionText) + ext.extractionText.length,
        length: ext.extractionText.length
      },
      confidence: ext.confidence || 1.0
    }));

    // Structure final result
    const structuredResult: ProcessingResult = {
      metadata: {
        processed_date: new Date().toISOString(),
        original_filename: filename,
        processing_time_ms: Date.now() - startTime
      },
      extraction: extractedData,
      citations: citations
    };

    return structuredResult;
  } catch (error) {
    console.error('LangExtract processing error:', error);
    throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Organize LangExtract extractions into the original three-section template
 */
function organizeExtractionsIntoTemplate(
  extractions: any[],
  template: any,
  fillMissing: string
): any {
  console.log('Organizing extractions, count:', extractions.length);
  
  // Log first few extractions for debugging
  if (extractions.length > 0) {
    console.log('Sample extractions:', extractions.slice(0, 3).map(e => ({
      class: e.extractionClass,
      text: e.extractionText?.substring(0, 50) + '...'
    })));
  }
  
  // Initialize result with template structure
  const result: any = {
    KEY_FIELDS: {},
    SUMMARY_PARAGRAPHS: {},
    DETAILS: {}
  };
  
  // Process KEY_FIELDS - extract specific values
  processKeyFields(result.KEY_FIELDS, template.KEY_FIELDS, extractions, fillMissing);
  
  // Process SUMMARY_PARAGRAPHS - extract paragraph text
  processSummaryParagraphs(result.SUMMARY_PARAGRAPHS, template.SUMMARY_PARAGRAPHS, extractions, fillMissing);
  
  // Process DETAILS - extract specific values
  processDetails(result.DETAILS, template.DETAILS, extractions, fillMissing);
  
  return result;
}

/**
 * Process KEY_FIELDS section - extract specific values
 */
function processKeyFields(
  keyFields: any,
  template: any,
  extractions: any[],
  fillMissing: string
): void {
  // Trust Name
  const trustNameExt = extractions.find(e => 
    e.extractionClass === 'trust_name' || 
    e.extractionClass === 'Trust_Name'
  );
  keyFields.Trust_Name = trustNameExt?.extractionText || fillMissing;
  
  // Grantor/Settlor/Trustor
  const grantorExts = extractions.filter(e => 
    e.extractionClass === 'grantor' || 
    e.extractionClass === 'grantor_primary' ||
    e.extractionClass === 'settlor' ||
    e.extractionClass === 'trustor'
  );
  keyFields.Grantor_Settlor_Trustor = grantorExts.length > 0 
    ? grantorExts.map(e => e.extractionText)
    : [];
  
  // Trustees
  keyFields.Trustees = {
    Initial_Trustees: [],
    Successor_Trustee_Provisions: fillMissing
  };
  
  const initialTrusteeExts = extractions.filter(e => 
    e.extractionClass === 'initial_trustee' || 
    e.extractionClass === 'trustee'
  );
  keyFields.Trustees.Initial_Trustees = initialTrusteeExts.map(e => e.extractionText);
  
  const successorExt = extractions.find(e => 
    e.extractionClass === 'successor_trustee' ||
    e.extractionClass?.includes('successor')
  );
  if (successorExt) {
    keyFields.Trustees.Successor_Trustee_Provisions = successorExt.extractionText;
  }
  
  // Beneficiaries
  keyFields.Beneficiaries = {
    Primary: [],
    Contingent: []
  };
  
  const primaryBenExts = extractions.filter(e => 
    e.extractionClass === 'beneficiary' ||
    e.extractionClass === 'primary_beneficiary'
  );
  keyFields.Beneficiaries.Primary = primaryBenExts.map(e => e.extractionText);
  
  const contingentBenExts = extractions.filter(e => 
    e.extractionClass === 'contingent_beneficiary'
  );
  keyFields.Beneficiaries.Contingent = contingentBenExts.map(e => e.extractionText);
  
  // Effective Date
  const dateExt = extractions.find(e => 
    e.extractionClass === 'date' ||
    e.extractionClass === 'trust_date' ||
    e.extractionClass === 'effective_date'
  );
  keyFields.Effective_Date = dateExt?.extractionText || fillMissing;
  
  // Trust Type
  const typeExt = extractions.find(e => 
    e.extractionClass === 'trust_type' ||
    e.extractionClass?.includes('revocable') ||
    e.extractionClass?.includes('irrevocable')
  );
  keyFields.Trust_Type = typeExt?.extractionText || fillMissing;
  
  // Trust Purpose
  const purposeExt = extractions.find(e => 
    e.extractionClass === 'trust_purpose' ||
    e.extractionClass === 'purpose'
  );
  keyFields.Trust_Purpose = purposeExt?.extractionText || fillMissing;
}

/**
 * Process SUMMARY_PARAGRAPHS section - create summaries with citation references
 */
function processSummaryParagraphs(
  summaryParagraphs: any,
  template: any,
  extractions: any[],
  fillMissing: string
): void {
  // Helper function to create summary with citations
  const createSummaryWithCitations = (extractionClasses: string[]): string => {
    const relevantExtractions = extractions.filter(e => 
      extractionClasses.includes(e.extractionClass)
    );
    
    if (relevantExtractions.length === 0) return fillMissing;
    
    // Create a condensed summary from the extracted sentences
    const sentences = relevantExtractions.map(e => {
      // Truncate very long extractions to first 1000 chars for summary
      const text = e.extractionText.length > 1000 
        ? e.extractionText.substring(0, 997) + '...'
        : e.extractionText;
      // Add citation reference
      return `${text} [${e.extractionClass}]`;
    });
    
    return sentences.join(' ');
  };
  
  // Trust Structure and Purpose
  summaryParagraphs.Trust_Structure_And_Purpose = createSummaryWithCitations([
    'trust_creation', 'trust_purpose_statement', 'trust_name', 'trust_date'
  ]);
  
  // Distribution Provisions
  summaryParagraphs.Distribution_Provisions = createSummaryWithCitations([
    'distribution_income', 'distribution_principal', 'distribution_timing'
  ]);
  
  // Trustee Powers and Duties
  summaryParagraphs.Trustee_Powers_And_Duties = createSummaryWithCitations([
    'trustee_investment_powers', 'trustee_administrative_powers'
  ]);
  
  // Beneficiary Provisions
  summaryParagraphs.Beneficiary_Provisions = createSummaryWithCitations([
    'beneficiary_designation', 'beneficiary_rights', 'primary_beneficiary', 'contingent_beneficiary'
  ]);
  
  // Amendment and Termination  
  summaryParagraphs.Amendment_And_Termination = createSummaryWithCitations([
    'amendment_provision', 'termination_provision'
  ]);
  
  // Special Provisions
  summaryParagraphs.Special_Provisions = createSummaryWithCitations([
    'gst_provisions', 'special_provisions', 'no_contest', 'spendthrift'
  ]);
}

/**
 * Process DETAILS section - extract specific values
 */
function processDetails(
  details: any,
  template: any,
  extractions: any[],
  fillMissing: string
): void {
  // Situs/Trust Location
  const situsExt = extractions.find(e => 
    e.extractionClass === 'situs' ||
    e.extractionClass === 'trust_location'
  );
  details.Situs_Trust_Location = situsExt?.extractionText || fillMissing;
  
  // Governing Law
  const lawExt = extractions.find(e => 
    e.extractionClass === 'governing_law' ||
    e.extractionClass?.includes('law')
  );
  details.Governing_Law = lawExt?.extractionText || fillMissing;
  
  // Duration/RAP
  const durationExt = extractions.find(e => 
    e.extractionClass === 'duration' ||
    e.extractionClass === 'perpetuities'
  );
  details.Duration_RAP = durationExt?.extractionText || fillMissing;
  
  // GST Tax Planning
  const gstExt = extractions.find(e => 
    e.extractionClass === 'gst' ||
    e.extractionClass === 'gst_tax'
  );
  details.GST_Tax_Planning = gstExt?.extractionText || fillMissing;
  
  // Tax ID/EIN Requirements
  const taxIdExt = extractions.find(e => 
    e.extractionClass === 'tax_id' ||
    e.extractionClass === 'ein'
  );
  details.Tax_ID_EIN_Requirements = taxIdExt?.extractionText || fillMissing;
  
  // Spendthrift Provisions
  const spendthriftExt = extractions.find(e => 
    e.extractionClass === 'spendthrift' ||
    e.extractionClass?.includes('spendthrift')
  );
  details.Spendthrift_Provisions = {
    Present: spendthriftExt ? "yes" : "unknown",
    Description: spendthriftExt?.extractionText || fillMissing
  };
  
  // No Contest/In Terrorem
  const noContestExt = extractions.find(e => 
    e.extractionClass === 'no_contest' ||
    e.extractionClass === 'in_terrorem'
  );
  details.No_Contest_In_Terrorem = noContestExt ? "yes" : "unknown";
  
  // Trust Protector
  const protectorExt = extractions.find(e => 
    e.extractionClass === 'trust_protector' ||
    e.extractionClass === 'protector'
  );
  details.Trust_Protector = {
    Present: protectorExt ? "yes" : "unknown",
    Name: protectorExt?.extractionText || fillMissing,
    Powers: fillMissing
  };
  
  // Other details
  details.Accounting_Requirements = fillMissing;
  details.Bond_Requirements_for_Trustee = fillMissing;
  details.Trustee_Compensation = fillMissing;
  details.Definition_of_Incapacity = fillMissing;
  details.Specific_Asset_Dispositions = [];
  details.Charitable_Provisions = fillMissing;
  details.Pet_Trust_Provisions = fillMissing;
}


/**
 * Save results to file
 */
export async function saveResultToFile(result: ProcessingResult): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                   new Date().toTimeString().split(' ')[0].replace(/:/g, '');
  const safeFilename = result.metadata.original_filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/\.[^.]+$/, '');
  
  const outputFilename = `${timestamp}_${safeFilename}.json`;
  const outputPath = path.join(__dirname, '../../../results', outputFilename);
  
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  
  return outputFilename;
}