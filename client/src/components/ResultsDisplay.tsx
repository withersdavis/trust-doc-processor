import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Download, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ProcessingResult } from '../types';
import { parseFormattedText, FormattedTextElement, formatTextForDisplay } from '../lib/utils';

interface ResultsDisplayProps {
  result: ProcessingResult;
  filename?: string;
  onBack?: () => void;
}

export function ResultsDisplay({ result, filename, onBack }: ResultsDisplayProps) {
  // Get all section names from the extraction
  const extractionData = result.extraction || result.result?.extraction || {};
  const sectionNames = Object.keys(extractionData);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sectionNames)
  );

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = async (text: string, sectionName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionName);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadResults = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename || result.filename || 'trust_analysis'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderFormattedText = (text: string): React.ReactElement => {
    const formattedText = formatTextForDisplay(text);
    const elements = parseFormattedText(formattedText);

    // If no special formatting is detected, return plain text
    if (elements.length === 1 && elements[0].type === 'text') {
      return <span className="text-sm">{elements[0].content}</span>;
    }

    return (
      <div className="space-y-2">
        {elements.map((element, index) => renderFormattedElement(element, index))}
      </div>
    );
  };

  const renderFormattedElement = (element: FormattedTextElement, index: number): React.ReactElement => {
    const { type, content, level = 1 } = element;

    switch (type) {
      case 'header':
        const headerLevel = Math.min(level + 3, 6);
        const headerClasses = {
          1: 'text-lg font-bold text-gray-900 mb-2 mt-3',
          2: 'text-base font-semibold text-gray-800 mb-2 mt-2',
          3: 'text-sm font-semibold text-gray-700 mb-1 mt-2',
          4: 'text-sm font-medium text-gray-600 mb-1 mt-1',
          5: 'text-xs font-medium text-gray-600 mb-1 mt-1',
          6: 'text-xs font-medium text-gray-500 mb-1 mt-1'
        };

        const headerClass = headerClasses[headerLevel as keyof typeof headerClasses] || headerClasses[3];

        if (headerLevel === 1) {
          return <h1 key={index} className={headerClass}>{content}</h1>;
        } else if (headerLevel === 2) {
          return <h2 key={index} className={headerClass}>{content}</h2>;
        } else if (headerLevel === 3) {
          return <h3 key={index} className={headerClass}>{content}</h3>;
        } else if (headerLevel === 4) {
          return <h4 key={index} className={headerClass}>{content}</h4>;
        } else if (headerLevel === 5) {
          return <h5 key={index} className={headerClass}>{content}</h5>;
        } else {
          return <h6 key={index} className={headerClass}>{content}</h6>;
        }

      case 'bullet':
        return (
          <div key={index} className="flex items-start">
            <span className="text-blue-600 mr-2 mt-1 flex-shrink-0 text-xs">•</span>
            <span className="flex-1 text-sm leading-relaxed">{content}</span>
          </div>
        );

      case 'number':
        return (
          <div key={index} className="flex items-start">
            <span className="text-blue-600 mr-2 mt-1 flex-shrink-0 font-medium text-xs">
              {index + 1}.
            </span>
            <span className="flex-1 text-sm leading-relaxed">{content}</span>
          </div>
        );

      case 'bold':
        return (
          <div key={index} className="font-semibold text-gray-900 text-sm leading-relaxed">
            {content}
          </div>
        );

      case 'italic':
        return (
          <div key={index} className="italic text-gray-700 text-sm leading-relaxed">
            {content}
          </div>
        );

      case 'paragraph':
        return (
          <p key={index} className="text-sm leading-relaxed text-gray-800 mb-1">
            {content}
          </p>
        );

      case 'text':
      default:
        return (
          <span key={index} className="text-sm leading-relaxed">
            {content}
          </span>
        );
    }
  };

  const renderValue = (value: any, depth = 0): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">Not specified</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-400 italic">Not specified</span>;
      }
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="flex items-start">
              <span className="text-blue-600 mr-2 mt-1 flex-shrink-0 text-xs">•</span>
              <div className="flex-1">
                {renderValue(item, depth + 1)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="space-y-2">
          {Object.entries(value).map(([key, val]) => (
            <div key={key} className="border-l-2 border-gray-200 pl-3">
              <div className="font-medium text-gray-700 text-sm mb-1">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
              </div>
              <div className="ml-2">
                {renderValue(val, depth + 1)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // For string values, apply enhanced formatting
    const stringValue = String(value);
    if (stringValue && stringValue !== 'Not specified') {
      return renderFormattedText(stringValue);
    }

    return <span className="text-sm text-gray-500">{stringValue}</span>;
  };

  const renderSection = (sectionName: string, sectionData: any) => {
    const isExpanded = expandedSections.has(sectionName);
    const sectionText = JSON.stringify(sectionData, null, 2);

    return (
      <Card key={sectionName} className="mb-4">
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection(sectionName)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
              {sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(sectionText, sectionName);
                }}
              >
                {copiedSection === sectionName ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="space-y-4">
              {Object.entries(sectionData).map(([key, value]) => (
                <div key={key} className="border-b last:border-0 pb-4 last:pb-0">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h4>
                  <div className="text-sm leading-relaxed">{renderValue(value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Document Analysis Results
              </h1>
              <p className="text-gray-600">
                {filename || result.filename || 'Trust Document Analysis'}
              </p>
            </div>
            <div className="flex gap-2">
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  Back to Upload
                </Button>
              )}
              <Button onClick={downloadResults}>
                <Download className="w-4 h-4 mr-2" />
                Download Results
              </Button>
            </div>
          </div>

          {/* Metadata */}
          {result.result?.metadata && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Processing Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Processed Date:</span>
                    <p className="text-gray-600">
                      {new Date(result.result.metadata.processed_date).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Original Filename:</span>
                    <p className="text-gray-600">{result.result.metadata.original_filename}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Processing Time:</span>
                    <p className="text-gray-600">
                      {result.result.metadata.processing_time_ms}ms
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Citations */}
          {(() => {
            const citations = result.result?.citations || result.citations || [];
            return citations.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Citations ({citations.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {citations.map((citation, index) => (
                      <div
                        key={index}
                        className="text-xs p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="font-semibold text-blue-700">
                          [{citation.citation_key || citation.class || `citation_${index}`}]
                        </div>
                        <div className="mt-1 text-gray-600 line-clamp-2">
                          "{citation.full_text || citation.text || 'No text available'}"
                        </div>
                        {citation.location && (
                          <div className="mt-1 text-gray-500">
                            Position: {citation.location.start}-{citation.location.end}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Extraction Results */}
          <div className="space-y-4">
            {sectionNames.map((sectionName) =>
              renderSection(sectionName, extractionData[sectionName])
            )}
          </div>
        </div>
      </div>
    </div>
  );
}