import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ArrowLeft, X } from 'lucide-react';
import { ProcessingResult, Citation } from '../types';
import { parseFormattedText, FormattedTextElement, formatTextForDisplay, formatDocumentForDisplay } from '../lib/utils';

interface ResultsViewProps {
  result: ProcessingResult;
  originalText: string;
  jsonFile?: string;
  sourceFile?: string;
  onBack: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result, originalText, jsonFile, sourceFile, onBack }) => {
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);
  const [highlightedText, setHighlightedText] = useState<string>('');
  const textViewerRef = useRef<HTMLDivElement>(null);

  // Build maps for citations
  const { citationMap, citationsByKey } = React.useMemo(() => {
    const map = new Map<string, Citation>();
    const byKey = new Map<string, Citation[]>();

    // Handle different structures
    const citations = result.result?.citations || result.citations || [];

    citations.forEach((citation, index) => {
      const citationKey = citation.citation_key || citation.class;
      if (citationKey) {
        // Group citations by their key first
        if (!byKey.has(citationKey)) {
          byKey.set(citationKey, []);
        }
        byKey.get(citationKey)!.push(citation);
      }
    });

    // Now create unique IDs based on the grouped citations
    byKey.forEach((citations, citationKey) => {
      citations.forEach((citation, index) => {
        const uniqueId = `${citationKey}_${index}`;
        map.set(uniqueId, citation);
      });
    });

    return { citationMap: map, citationsByKey: byKey };
  }, [result]);

  useEffect(() => {
    // Format the original document for better readability
    const formattedDocument = formatDocumentForDisplay(originalText);
    setHighlightedText(formattedDocument);
  }, [originalText]);

  const handleCitationClick = (citationId: string) => {
    setSelectedCitation(citationId);
    const citation = citationMap.get(citationId);

    if (citation && citation.location) {
      highlightCitation(citation);
      scrollToCitation(citation);
    }
  };

  const highlightCitation = (citation: Citation) => {
    if (!citation.location) {
      // Reset to formatted document without highlighting
      const formattedDocument = formatDocumentForDisplay(originalText);
      setHighlightedText(formattedDocument);
      return;
    }

    const { start, end } = citation.location;
    const fullText = citation.full_text || citation.text || '';

    // Try to find the full text in the document for better highlighting
    let highlightStart = start;
    let highlightEnd = end;

    if (fullText && fullText.length > (end - start)) {
      // The full text is longer than the citation location, try to find it in the document
      const fullTextStart = originalText.indexOf(fullText);
      if (fullTextStart !== -1) {
        highlightStart = fullTextStart;
        highlightEnd = fullTextStart + fullText.length;
      }
    }

    // Create highlighted version by inserting highlight markers into the original text
    const beforeText = originalText.substring(0, highlightStart);
    const citedText = originalText.substring(highlightStart, highlightEnd);
    const afterText = originalText.substring(highlightEnd);

    // Insert highlight markers that will be preserved during formatting
    const textWithMarkers = beforeText +
      '<!--HIGHLIGHT_START-->' + citedText + '<!--HIGHLIGHT_END-->' +
      afterText;

    // Format the document with highlight markers
    const formattedDocument = formatDocumentForDisplay(textWithMarkers);

    // Replace the highlight markers with actual highlight HTML
    const highlightedHtml = formattedDocument
      .replace(/<!--HIGHLIGHT_START-->/g, '<mark class="bg-yellow-300 font-semibold px-1 rounded" id="highlighted-citation">')
      .replace(/<!--HIGHLIGHT_END-->/g, '</mark>');

    setHighlightedText(highlightedHtml);
  };

  const scrollToCitation = (citation: Citation) => {
    if (textViewerRef.current) {
      setTimeout(() => {
        const highlightedElement = document.getElementById('highlighted-citation');
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const clearHighlight = () => {
    setSelectedCitation(null);
    const formattedDocument = formatDocumentForDisplay(originalText);
    setHighlightedText(formattedDocument);
  };


  const renderValue = (value: any, fieldPath: string = ''): React.ReactElement => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">Not specified</span>;
    }

    // Handle objects with nested structure
    if (typeof value === 'object' && !Array.isArray(value)) {
      if (value.value !== undefined) {
        return renderFormattedText(String(value.value), fieldPath);
      }

      return (
        <div className="ml-4 space-y-3">
          {Object.entries(value).map(([key, val]) => (
            <div key={key} className="border-l-2 border-gray-200 pl-3">
              <div className="font-medium text-gray-700 text-sm mb-1">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
              </div>
              <div className="ml-2">
                {renderValue(val, `${fieldPath}.${key}`)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return (
        <div className="ml-4 space-y-2">
          {value.map((item, index) => (
            <div key={index} className="flex items-start flex-wrap">
              <span className="text-blue-600 mr-2 mt-1 flex-shrink-0">•</span>
              <div >
                {renderValue(item, `${fieldPath}[${index}]`)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // For string values, apply enhanced formatting with citation links
    const stringValue = String(value);
    if (stringValue && stringValue !== 'Not specified') {
      return renderFormattedText(stringValue, fieldPath);
    }

    return <span className="text-gray-500">{stringValue}</span>;
  };

  const renderValueWithCitations = (value: any, fieldPath: string = '', typeOfContent: string): React.ReactElement => {
    // Get citations for this field
    const fieldToCitationMap: Record<string, string> = {
      'Trust_Name': 'trust_name',
      'Effective_Date': 'effective_date',
      'Grantor(s)': 'grantor(s)',
      'Trustee(s)': 'initial_trustee',
      'Successor_Trustee(s)': 'successor_trustees',
      'Primary_Beneficiaries': 'primary_beneficiaries',
      'Contingent_Beneficiaries': 'contingent_beneficiaries',
      'Trust_Type': 'trust_type',
      'Purpose_and_Intent': 'purpose_and_intent',
      'Distribution_Provisions': 'distribution_provisions',
      'Trustee_Powers_and_Duties': 'trustee_powers_and_duties',
      'Amendment_and_Termination': 'amendment_and_termination',
      'Special_Provisions': 'special_provisions',
      'How_the_Trust_Works': 'how_the_trust_works'
    };

    // Handle array field paths like "Grantor(s)[0]" -> "Grantor(s)"
    const baseFieldPath = fieldPath.replace(/\[\d+\]$/, '');
    const citationKey = fieldToCitationMap[baseFieldPath] || baseFieldPath;
    const citations = citationKey ? citationsByKey.get(citationKey) || [] : [];

    // Render the value content
    const valueContent = renderValue(value, fieldPath);

    // If no citations, just return the value
    if (citations.length === 0) {
      return valueContent;
    }

    // For arrays, show citations inline with the array items
    if (Array.isArray(value)) {
      // Render citation buttons
      const citationButtons = citations.map((citation, index) => {
        const uniqueId = `${citationKey}_${index}`;

        return (
          <button
            key={uniqueId}
            className="hover:text-blue-600"
            onClick={() => handleCitationClick(uniqueId)}
            title={`View: ${citation.full_text || citation.text || citationKey}`}
          >
            <span className="font-medium">
              <sup>{citations.length > 1 ? ` [${index + 1}]` : '[1]'}</sup>
            </span>
          </button>
        );
      });

      return (
        <div className="flex items-start flex-wrap gap-1">
          <div >{valueContent}</div>
          <div className="flex flex-col gap-1 space-y-1">
            {citationButtons}
          </div>
        </div>
      );
    }

    // For non-array values, show citations inline
    const citationButtons = citations.map((citation, index) => {
      const uniqueId = `${citationKey}_${index}`;

      return (
        <button
          key={uniqueId}
          className="hover:text-blue-600"
          onClick={() => handleCitationClick(uniqueId)}
          title={`View: ${citation.full_text || citation.text || citationKey}`}
        >
          <span className="font-medium">
            <sup>{citations.length > 1 ? ` [${index + 1}]` : '[1]'}</sup>
          </span>
        </button>
      );
    });

    return (
      <div className="flex items-start flex-wrap gap-1">
        <div className="flex max-w-[93%] text-justify">{valueContent}</div>
        <div className="flex flex-wrap gap-1">
          {citationButtons}
        </div>
      </div>
    );
  };

  const renderFormattedText = (text: string, fieldPath: string = ''): React.ReactElement => {
    const formattedText = formatTextForDisplay(text);
    const elements = parseFormattedText(formattedText);

    // If no special formatting is detected, return plain text with potential citation links
    if (elements.length === 1 && elements[0].type === 'text') {
      return renderTextWithCitations(elements[0].content, fieldPath);
    }

    return (
      <div className="space-y-3">
        {elements.map((element, index) => renderFormattedElement(element, index, fieldPath))}
      </div>
    );
  };


  // Function to render text with citation links
  const renderTextWithCitations = (text: string, fieldPath: string): React.ReactElement => {
    // Simply return the text without any citation links
    return <span>{text}</span>;
  };

  const renderFormattedElement = (element: FormattedTextElement, index: number, fieldPath: string = ''): React.ReactElement => {
    const { type, content, level = 1 } = element;

    switch (type) {
      case 'header':
        const headerLevel = Math.min(level + 2, 6);
        const headerClasses = {
          1: 'text-xl font-bold text-gray-900 mb-3 mt-4',
          2: 'text-lg font-semibold text-gray-800 mb-2 mt-3',
          3: 'text-base font-semibold text-gray-700 mb-2 mt-2',
          4: 'text-sm font-semibold text-gray-600 mb-1 mt-2',
          5: 'text-sm font-medium text-gray-600 mb-1 mt-1',
          6: 'text-xs font-medium text-gray-500 mb-1 mt-1'
        };

        const headerClass = headerClasses[headerLevel as keyof typeof headerClasses] || headerClasses[3];

        if (headerLevel === 1) {
          return <h1 key={index} className={headerClass}>{renderTextWithCitations(content, fieldPath)}</h1>;
        } else if (headerLevel === 2) {
          return <h2 key={index} className={headerClass}>{renderTextWithCitations(content, fieldPath)}</h2>;
        } else if (headerLevel === 3) {
          return <h3 key={index} className={headerClass}>{renderTextWithCitations(content, fieldPath)}</h3>;
        } else if (headerLevel === 4) {
          return <h4 key={index} className={headerClass}>{renderTextWithCitations(content, fieldPath)}</h4>;
        } else if (headerLevel === 5) {
          return <h5 key={index} className={headerClass}>{renderTextWithCitations(content, fieldPath)}</h5>;
        } else {
          return <h6 key={index} className={headerClass}>{renderTextWithCitations(content, fieldPath)}</h6>;
        }

      case 'bullet':
        return (
          <div key={index} className="flex items-start">
            <span className="text-blue-600 mr-2 mt-1 flex-shrink-0">•</span>
            <span className="flex-1 text-sm leading-relaxed">{renderTextWithCitations(content, fieldPath)}</span>
          </div>
        );

      case 'number':
        return (
          <div key={index} className="flex items-start">
            <span className="text-blue-600 mr-2 mt-1 flex-shrink-0 font-medium">
              {index + 1}.
            </span>
            <span className="flex-1 text-sm leading-relaxed">{renderTextWithCitations(content, fieldPath)}</span>
          </div>
        );

      case 'bold':
        return (
          <div key={index} className="font-semibold text-gray-900 text-sm leading-relaxed">
            {renderTextWithCitations(content, fieldPath)}
          </div>
        );

      case 'italic':
        return (
          <div key={index} className="italic text-gray-700 text-sm leading-relaxed">
            {renderTextWithCitations(content, fieldPath)}
          </div>
        );

      case 'paragraph':
        return (
          <p key={index} className="text-sm leading-relaxed text-gray-800 mb-2">
            {renderTextWithCitations(content, fieldPath)}
          </p>
        );

      case 'text':
      default:
        return (
          <span key={index} className="text-sm leading-relaxed">
            {renderTextWithCitations(content, fieldPath)}
          </span>
        );
    }
  };

  const renderFieldWithCitation = (fieldKey: string, value: any) => {
    return (
      <div className="border-b last:border-0 pb-4 last:pb-0">
        <h4 className="font-semibold text-sm text-gray-700 mb-2">
          {fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </h4>
        <div className="text-sm leading-relaxed">
          {renderValueWithCitations(value, fieldKey, 'paragraph')}
        </div>
      </div>
    );
  };

  const renderSection = (title: string, data: any) => {
    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(data).map(([key, value]) => (
            <React.Fragment key={key}>
              {renderFieldWithCitation(key, value)}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    );
  };

  // Get the extraction data from the appropriate location
  const extractionData = result.extraction || result.result?.extraction || {
    Basic_Information: result.Basic_Information || result.KEY_FIELDS,
    Summary: result.Summary || result.SUMMARY_PARAGRAPHS,
    Details: result.Details || result.DETAILS
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Document Analysis Results</h1>
            <p className="text-sm text-gray-600">{result.filename}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedCitation && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary">
                Viewing: {selectedCitation.split('_').slice(0, -1).join(' ')}
              </Badge>
              <button
                onClick={clearHighlight}
                className="text-gray-500 hover:text-gray-700"
                title="Clear highlight"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Results */}
        <div className="w-1/2 bg-gray-50 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-4">
              {renderSection('Basic Information', extractionData.Basic_Information)}
              {renderSection('Summary', extractionData.Summary)}
              {renderSection('Details', extractionData.Details)}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Original Text */}
        <div className="w-1/2 bg-white overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Original Document</h3>
            <p className="text-sm text-gray-600">Click citations to highlight text</p>
          </div>
          <ScrollArea className="h-[calc(100vh-120px)]" ref={textViewerRef}>
            <div className="p-4">
              <div
                className="prose max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: highlightedText }}
              />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;