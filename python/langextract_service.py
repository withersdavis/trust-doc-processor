#!/usr/bin/env python3
"""
LangExtract Python Service for Trust Document Processing
Uses trust_template_new.json and langextract_few_shot_examples.json
"""

import sys
import json
import os
from pathlib import Path
import socket
import time

# Import langextract
import langextract as lx

# Pre-resolve DNS to avoid parallel resolution issues
def pre_resolve_dns():
    """Pre-resolve Gemini API DNS to avoid parallel resolution issues"""
    try:
        socket.gethostbyname('generativelanguage.googleapis.com')
    except:
        pass  # Ignore errors, let langextract handle them

def load_template():
    """Load the trust template from lib folder"""
    template_path = Path(__file__).parent.parent / "lib" / "trust_template_new.json"
    with open(template_path, 'r') as f:
        return json.load(f)

def load_params():
    """Load LangExtract parameters from lib folder"""
    params_path = Path(__file__).parent.parent / "lib" / "langExtract_params.json"
    with open(params_path, 'r') as f:
        return json.load(f)

def load_few_shot_examples():
    """Load few-shot examples from lib folder"""
    examples_path = Path(__file__).parent.parent / "lib" / "langextract_few_shot_examples.json"
    with open(examples_path, 'r') as f:
        return json.load(f)

def create_extraction_classes_from_template(template):
    """Create extraction classes based on template structure"""
    extraction_classes = []
    
    # Basic Information fields
    for field in template.get('Basic_Information', {}):
        # Create extraction class names from field names
        class_name = field.replace('(s)', '').replace(' ', '_').lower()
        extraction_classes.append(class_name)
    
    # Summary fields - these need content extraction
    for field in template.get('Summary', {}):
        class_name = field.replace(' ', '_').lower()
        extraction_classes.append(class_name)
    
    # Details fields
    for field in template.get('Details', {}):
        if field != 'Other_Provisions':
            class_name = field.replace(' ', '_').replace('-', '_').lower()
            extraction_classes.append(class_name)
    
    return extraction_classes

def create_examples_from_few_shot():
    """Convert few-shot examples to langextract format"""
    examples = []
    few_shot_data = load_few_shot_examples()
    
    for item in few_shot_data:
        if 'Input' in item and 'Output' in item:
            input_text = item['Input']
            output = item['Output']
            
            # Extract structured data from output
            if 'Final Extracted Data' in output:
                data = output['Final Extracted Data']
                extractions = []
                
                # Convert extracted data to langextract extractions
                for key, value in data.items():
                    if isinstance(value, list):
                        for v in value:
                            if v and v != 'N/A':
                                class_name = key.replace(' ', '_').lower()
                                extractions.append(
                                    lx.data.Extraction(
                                        extraction_class=class_name,
                                        extraction_text=v
                                    )
                                )
                    elif value and value != 'N/A':
                        class_name = key.replace(' ', '_').lower()
                        extractions.append(
                            lx.data.Extraction(
                                extraction_class=class_name,
                                extraction_text=value
                            )
                        )
                
                if extractions:
                    examples.append(lx.data.ExampleData(
                        text=input_text,
                        extractions=extractions
                    ))
            
            # Handle summary outputs
            elif 'Final Extracted Summary' in output or 'Final Extracted Trust Name' in output:
                extractions = []
                
                if 'Final Extracted Trust Name' in output:
                    extractions.append(
                        lx.data.Extraction(
                            extraction_class='trust_name',
                            extraction_text=output['Final Extracted Trust Name']
                        )
                    )
                
                if 'Final Extracted Summary' in output:
                    summary_data = output['Final Extracted Summary']
                    
                    # Handle both string and dict formats
                    if isinstance(summary_data, dict):
                        # Extract each field from the dictionary
                        for key, value in summary_data.items():
                            if value and value != 'N/A':
                                class_name = key.replace(' ', '_').lower()
                                extractions.append(
                                    lx.data.Extraction(
                                        extraction_class=class_name,
                                        extraction_text=value
                                    )
                                )
                    else:
                        # Handle as string
                        instruction = item.get('Instruction', '').lower()
                        if 'distribution' in instruction:
                            class_name = 'distribution_provisions'
                        elif 'current benefits' in instruction:
                            class_name = 'distribution_provisions'
                        else:
                            class_name = 'summary'
                        
                        extractions.append(
                            lx.data.Extraction(
                                extraction_class=class_name,
                                extraction_text=summary_data
                            )
                        )
                
                if extractions:
                    examples.append(lx.data.ExampleData(
                        text=input_text,
                        extractions=extractions
                    ))
    
    return examples

def process_document(document_text, api_key, instructions=None):
    """Process document using LangExtract with parameters from config files"""
    
    # Pre-resolve DNS to avoid parallel resolution issues
    pre_resolve_dns()
    
    # Load configuration
    template = load_template()
    params = load_params()
    
    # Create examples from few-shot data
    examples = create_examples_from_few_shot()
    
    # Set up API key
    os.environ['LANGEXTRACT_API_KEY'] = api_key
    
    # Create extraction instructions if provided
    extraction_instructions = None
    if instructions:
        extraction_instructions = instructions
    
    try:
        # Call langextract with parameters from config file
        result = lx.extract(
            document_text,
            examples=examples,
            model_id=params.get('model_id', 'gemini-2.5-flash'),
            temperature=params.get('temperature', 0.1),
            extraction_passes=params.get('extraction_passes', 3),
            max_workers=params.get('max_workers', 10),
            batch_length=params.get('batch_length', 10),
            max_char_buffer=params.get('max_char_buffer', 4000)
        )
        
        # Save original LangExtract output
        original_langextract_output = {
            "extractions": [],
            "metadata": {
                "model_id": params.get('model_id', 'gemini-2.5-flash'),
                "extraction_passes": params.get('extraction_passes', 3),
                "max_workers": params.get('max_workers', 10),
                "batch_length": params.get('batch_length', 10),
                "max_char_buffer": params.get('max_char_buffer', 4000),
                "temperature": params.get('temperature', 0.1)
            }
        }
        
        # Capture raw extractions
        if hasattr(result, 'extractions'):
            for extraction in result.extractions:
                # Get character positions from char_interval if available
                char_start = 0
                char_end = len(extraction.extraction_text)
                if hasattr(extraction, 'char_interval') and extraction.char_interval:
                    char_start = extraction.char_interval.start_pos
                    char_end = extraction.char_interval.end_pos
                
                original_extraction = {
                    "extraction_class": extraction.extraction_class,
                    "extraction_text": extraction.extraction_text,
                    "char_start": char_start,
                    "char_end": char_end,
                    "attributes": getattr(extraction, 'attributes', {})
                }
                original_langextract_output["extractions"].append(original_extraction)
        
        # Initialize structured result for transformed output
        structured_result = {
            "Basic_Information": {},
            "Summary": {},
            "Details": {},
            "citations": []
        }
        
        # Process extractions for transformation
        if hasattr(result, 'extractions'):
            for extraction in result.extractions:
                # Get extraction data
                class_name = extraction.extraction_class
                text = extraction.extraction_text
                
                # Get character positions from char_interval if available
                start = 0
                end = len(text)
                if hasattr(extraction, 'char_interval') and extraction.char_interval:
                    start = extraction.char_interval.start_pos
                    end = extraction.char_interval.end_pos
                
                # Add to citations
                citation = {
                    "citation_key": class_name,
                    "full_text": text,
                    "location": {
                        "start": start,
                        "end": end
                    }
                }
                structured_result["citations"].append(citation)
                
                # Map to template structure
                map_to_template(class_name, text, structured_result)
        
        # Fill missing fields with defaults
        fill_missing = params.get('fill_missing', {})
        if fill_missing.get('enabled', True):
            default_value = fill_missing.get('default_value', 'Not specified')
            fill_missing_fields(structured_result, template, default_value)
        
        # Return both original and transformed outputs
        return {
            "original_langextract": original_langextract_output,
            "transformed": structured_result
        }
        
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc()
        }

def map_to_template(class_name, text, result):
    """Map extraction to template structure based on class name with flexible role handling"""
    
    # Normalize class name
    normalized = class_name.lower().replace('_', '').replace(' ', '').replace('-', '')
    
    # Debug logging for trustee_powers
    if 'trusteepower' in normalized:
        import sys
        print(f"DEBUG: Processing {class_name} -> normalized: {normalized}", file=sys.stderr)
    
    # Check for timing/condition modifiers
    is_successor = any(term in normalized for term in ['successor', 'alternate', 'backup', 'secondary'])
    is_contingent = any(term in normalized for term in ['contingent', 'upondeath', 'ifno', 'remainder'])
    is_initial = any(term in normalized for term in ['initial', 'current', 'primary', 'first'])
    is_lifetime = any(term in normalized for term in ['lifetime', 'living', 'duringlife'])
    
    # Basic Information mappings
    if 'trustname' in normalized:
        result['Basic_Information']['Trust_Name'] = text
    
    elif 'trusttype' in normalized:
        result['Basic_Information']['Trust_Type'] = text
    
    elif 'effectivedate' in normalized or 'trustdate' in normalized:
        result['Basic_Information']['Effective_Date'] = text
    
    # Flexible grantor/settlor/trustor handling
    elif any(term in normalized for term in ['grantor', 'settlor', 'trustor']):
        if not is_successor:
            if 'Grantor(s)' not in result['Basic_Information']:
                result['Basic_Information']['Grantor(s)'] = []
            if text not in result['Basic_Information']['Grantor(s)']:
                result['Basic_Information']['Grantor(s)'].append(text)
    
    # Check for trustee powers BEFORE general trustee handling
    elif 'trusteepowers' in normalized or 'trusteepower' in normalized:
        if 'Trustee_Powers_and_Duties' not in result['Summary']:
            result['Summary']['Trustee_Powers_and_Duties'] = text
        else:
            result['Summary']['Trustee_Powers_and_Duties'] += ' ' + text
    
    # Flexible trustee handling
    elif 'trustee' in normalized:
        # Handle special trustees (e.g., "special_trustee_for_real_estate")
        if 'special' in normalized or 'committee' in normalized:
            # Store in Details as special provision
            if 'Other_Provisions' not in result['Details']:
                result['Details']['Other_Provisions'] = {}
            result['Details']['Other_Provisions'][class_name] = text
        elif is_successor:
            if 'Successor_Trustee(s)' not in result['Basic_Information']:
                result['Basic_Information']['Successor_Trustee(s)'] = []
            if text not in result['Basic_Information']['Successor_Trustee(s)']:
                result['Basic_Information']['Successor_Trustee(s)'].append(text)
        else:
            if 'Trustee(s)' not in result['Basic_Information']:
                result['Basic_Information']['Trustee(s)'] = []
            if text not in result['Basic_Information']['Trustee(s)']:
                result['Basic_Information']['Trustee(s)'].append(text)
    
    # Flexible beneficiary handling
    elif 'beneficiar' in normalized:
        # Check for various beneficiary types
        if is_lifetime or 'duringgrantorslife' in normalized:
            # Lifetime beneficiary is typically the grantor themselves
            if 'Primary_Beneficiaries' not in result['Basic_Information']:
                result['Basic_Information']['Primary_Beneficiaries'] = []
            if text not in result['Basic_Information']['Primary_Beneficiaries']:
                result['Basic_Information']['Primary_Beneficiaries'].append(text)
        elif is_contingent or 'remainder' in normalized or 'alternate' in normalized:
            if 'Contingent_Beneficiaries' not in result['Basic_Information']:
                result['Basic_Information']['Contingent_Beneficiaries'] = []
            if text not in result['Basic_Information']['Contingent_Beneficiaries']:
                result['Basic_Information']['Contingent_Beneficiaries'].append(text)
        elif 'primary' in normalized or is_initial or 'upondeath' in normalized:
            # Upon death beneficiaries that are not contingent
            if 'Primary_Beneficiaries' not in result['Basic_Information']:
                result['Basic_Information']['Primary_Beneficiaries'] = []
            if text not in result['Basic_Information']['Primary_Beneficiaries']:
                result['Basic_Information']['Primary_Beneficiaries'].append(text)
    
    # Summary mappings
    elif 'purpose' in normalized or 'intent' in normalized:
        if 'Purpose_and_Intent' not in result['Summary']:
            result['Summary']['Purpose_and_Intent'] = text
        else:
            result['Summary']['Purpose_and_Intent'] += ' ' + text
    
    elif 'howthetrustwork' in normalized or 'howthetrust' in normalized or 'operation' in normalized:
        if 'How_the_Trust_Works' not in result['Summary']:
            result['Summary']['How_the_Trust_Works'] = text
        else:
            result['Summary']['How_the_Trust_Works'] += ' ' + text
    
    elif 'distribution' in normalized:
        if 'Distribution_Provisions' not in result['Summary']:
            result['Summary']['Distribution_Provisions'] = text
        else:
            result['Summary']['Distribution_Provisions'] += ' ' + text
    
    elif 'power' in normalized or 'duties' in normalized:
        # General power/duties that weren't caught by trustee_powers
        if 'Trustee_Powers_and_Duties' not in result['Summary']:
            result['Summary']['Trustee_Powers_and_Duties'] = text
        else:
            result['Summary']['Trustee_Powers_and_Duties'] += ' ' + text
    
    elif 'amendment' in normalized or 'termination' in normalized:
        if 'Amendment_and_Termination' not in result['Summary']:
            result['Summary']['Amendment_and_Termination'] = text
        else:
            result['Summary']['Amendment_and_Termination'] += ' ' + text
    
    elif 'special' in normalized and 'provision' in normalized:
        if 'Special_Provisions' not in result['Summary']:
            result['Summary']['Special_Provisions'] = text
        else:
            result['Summary']['Special_Provisions'] += ' ' + text
    
    # Details mappings
    elif 'taxid' in normalized or 'ein' in normalized:
        result['Details']['Trust_Tax_ID/EIN'] = text
    
    elif 'stateofformation' in normalized or 'governinglaw' in normalized:
        result['Details']['State_of_Formation'] = text
    
    elif 'trustprotector' in normalized:
        result['Details']['Trust_Protector'] = text
    
    elif 'investmentadvisor' in normalized:
        result['Details']['Investment_Advisor'] = text
    
    elif 'distributionadvisor' in normalized:
        result['Details']['Distribution_Advisor'] = text
    
    elif 'gsttax' in normalized or 'gstplanning' in normalized:
        result['Details']['GST_Tax_Planning'] = text
    
    elif 'maritaldeduction' in normalized:
        result['Details']['Marital_Deduction'] = text
    
    elif 'lawfirm' in normalized:
        result['Details']['Law_Firm'] = text
    
    elif 'trustsitus' in normalized or 'situs' in normalized:
        result['Details']['Trust_Situs'] = text
    
    elif 'spendthrift' in normalized:
        result['Details']['Spendthrift_Provision'] = 'yes' if text else 'no'
    
    elif 'nocontest' in normalized:
        result['Details']['No-Contest_Clause'] = 'yes' if text else 'no'
    
    # Catch-all for specialized roles and positions
    elif any(term in normalized for term in ['advisor', 'adviser', 'committee', 'protector', 'manager', 'advocate', 'guardian']):
        # Store any specialized roles in Other_Provisions
        if 'Other_Provisions' not in result['Details']:
            result['Details']['Other_Provisions'] = {}
        # Use the original class name as the key for clarity
        result['Details']['Other_Provisions'][class_name] = text
    
    # Ultimate catch-all for any unmapped fields
    else:
        # Try to categorize based on content patterns
        # If it looks like a summary/description (longer text), put it in Other_Summary_Provisions
        if len(text) > 100:
            if 'Other_Summary_Provisions' not in result['Summary']:
                result['Summary']['Other_Summary_Provisions'] = {}
            if not isinstance(result['Summary']['Other_Summary_Provisions'], dict):
                result['Summary']['Other_Summary_Provisions'] = {}
            result['Summary']['Other_Summary_Provisions'][class_name] = text
        else:
            # Shorter items go to Details/Other_Provisions
            if 'Other_Provisions' not in result['Details']:
                result['Details']['Other_Provisions'] = {}
            result['Details']['Other_Provisions'][class_name] = text

def fill_missing_fields(result, template, default_value):
    """Fill empty fields with default values based on template"""
    
    # Fill Basic_Information
    if 'Basic_Information' in template:
        for field, field_type in template['Basic_Information'].items():
            if field not in result['Basic_Information']:
                if isinstance(field_type, list):
                    result['Basic_Information'][field] = []
                else:
                    result['Basic_Information'][field] = default_value
    
    # Fill Summary
    if 'Summary' in template:
        for field in template['Summary']:
            if field not in result['Summary']:
                if field == 'Other_Summary_Provisions':
                    result['Summary'][field] = {}
                else:
                    result['Summary'][field] = default_value
    
    # Fill Details
    if 'Details' in template:
        for field, field_type in template['Details'].items():
            if field not in result['Details']:
                if field == 'Other_Provisions':
                    result['Details'][field] = {}
                elif field_type == 'yes_no':
                    result['Details'][field] = 'no'
                else:
                    result['Details'][field] = default_value

def main():
    """Main entry point"""
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())
    
    document_text = input_data.get("document_text", "")
    api_key = input_data.get("api_key", "")
    instructions = input_data.get("instructions", None)
    
    if not api_key:
        result = {"error": "No API key provided"}
    elif not document_text:
        result = {"error": "No document text provided"}
    else:
        result = process_document(document_text, api_key, instructions)
    
    # Output result as JSON
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()