import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Download, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ProcessingResult {
  metadata: {
    processed_date: string;
    original_filename: string;
    processing_time_ms: number;
  };
  extraction: {
    // Support both old and new template structures
    KEY_FIELDS?: any;
    SUMMARY_PARAGRAPHS?: any;
    DETAILS?: any;
    Basic_Information?: any;
    Summary?: any;
    Details?: any;
  };
  citations: Array<{
    text?: string;
    citation_key?: string;
    full_text?: string;
    location?: any;
    confidence?: number;
  }>;
}

interface ResultsDisplayProps {
  result: ProcessingResult;
  filename?: string;
}

export function ResultsDisplay({ result, filename }: ResultsDisplayProps) {
  // Get all section names from the extraction
  const sectionNames = Object.keys(result.extraction || {});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sectionNames)
  );
  const [copied, setCopied] = useState(false);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `trust_analysis_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderValue = (value: any, indent: number = 0): React.ReactElement => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">Not specified</span>;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return (
        <div className="ml-4">
          {Object.entries(value).map(([key, val]) => (
            <div key={key} className="py-1">
              <span className="font-medium text-gray-700">{key}: </span>
              {renderValue(val, indent + 1)}
            </div>
          ))}
        </div>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-400">[]</span>;
      }
      return (
        <div className="ml-4">
          {value.map((item, index) => (
            <div key={index} className="py-1">
              <span className="text-gray-500">[{index}]</span> {renderValue(item, indent + 1)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === 'string' && value.length > 100) {
      return (
        <div className="mt-1 p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap">
          {value}
        </div>
      );
    }

    return <span className="text-gray-800">{String(value)}</span>;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Processing Results</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy JSON
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadJSON}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Metadata */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Metadata</h3>
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Original File:</span> {result.metadata.original_filename}
              </div>
              <div>
                <span className="font-medium">Processed:</span> {new Date(result.metadata.processed_date).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Processing Time:</span> {result.metadata.processing_time_ms}ms
              </div>
            </div>
          </div>

          {/* Main Sections */}
          {Object.entries(result.extraction).map(([section, content]) => (
            <div key={section} className="border rounded-lg mb-4">
              <button
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection(section)}
              >
                <h3 className="font-semibold text-lg">
                  {section.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                {expandedSections.has(section) ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>
              {expandedSections.has(section) && (
                <div className="px-4 py-3 border-t">
                  {renderValue(content)}
                </div>
              )}
            </div>
          ))}

          {/* Citations */}
          {result.citations && result.citations.length > 0 && (
            <div className="border rounded-lg">
              <button
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('citations')}
              >
                <h3 className="font-semibold text-lg">
                  Citations ({result.citations.length})
                </h3>
                {expandedSections.has('citations') ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>
              {expandedSections.has('citations') && (
                <div className="px-4 py-3 border-t space-y-2">
                  {result.citations.map((citation, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded text-sm">
                      <div className="font-medium text-gray-700 mb-1">
                        {citation.citation_key ? 
                          `[${citation.citation_key}] Citation ${index + 1}` : 
                          `Citation ${index + 1}`
                        }
                      </div>
                      <div className="text-gray-600">
                        {citation.full_text || citation.text || 'No text available'}
                      </div>
                      {citation.location && (
                        <div className="text-xs text-gray-500 mt-1">
                          Location: {citation.location.start || 0} - {citation.location.end || 0}
                        </div>
                      )}
                      {citation.confidence && (
                        <div className="text-xs text-gray-500 mt-1">
                          Confidence: {(citation.confidence * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}