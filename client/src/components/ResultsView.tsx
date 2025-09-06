import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { FileText } from 'lucide-react';

interface Citation {
  text: string;
  class: string;
  location?: {
    start: number;
    end: number;
    length: number;
  };
  confidence?: number;
}

interface ProcessingResult {
  KEY_FIELDS?: Record<string, any>;
  SUMMARY_PARAGRAPHS?: Record<string, any>;
  DETAILS?: Record<string, any>;
  citations?: Citation[];
}

interface ResultsViewProps {
  result: ProcessingResult;
  originalText: string;
  jsonFile: string;
  sourceFile: string;
  onBack?: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result, originalText, jsonFile, sourceFile, onBack }) => {
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);
  const [highlightedText, setHighlightedText] = useState<string>('');
  const textViewerRef = useRef<HTMLDivElement>(null);
  
  // Build a map of citation classes to their citations
  const citationMap = React.useMemo(() => {
    const map = new Map<string, Citation>();
    if (result.citations) {
      result.citations.forEach(citation => {
        if (citation.class) {
          map.set(citation.class, citation);
        }
      });
    }
    return map;
  }, [result.citations]);

  useEffect(() => {
    // Initialize with the original text
    setHighlightedText(originalText);
  }, [originalText]);

  const handleCitationClick = (citationClass: string) => {
    setSelectedCitation(citationClass);
    const citation = citationMap.get(citationClass);
    
    if (citation && citation.location) {
      // Highlight the citation in the text
      highlightCitation(citation);
      
      // Scroll to the citation in the text viewer
      scrollToCitation(citation);
    }
  };

  const highlightCitation = (citation: Citation) => {
    if (!citation.location) {
      setHighlightedText(originalText);
      return;
    }

    const { start, end } = citation.location;
    
    // Create highlighted text with proper HTML escaping
    const beforeText = originalText.substring(0, start);
    const citedText = originalText.substring(start, end);
    const afterText = originalText.substring(end);
    
    // Escape HTML characters
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };
    
    const highlightedHtml = 
      escapeHtml(beforeText) + 
      '<mark class="bg-yellow-300 font-semibold" id="highlighted-citation">' + 
      escapeHtml(citedText) + 
      '</mark>' + 
      escapeHtml(afterText);
    
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
    setHighlightedText(originalText);
  };

  const renderCitationText = (text: string) => {
    // Parse text for inline citations like [citation_key]
    const parts = text.split(/(\[[^\]]+\])/);
    
    return (
      <>
        {parts.map((part, index) => {
          const match = part.match(/^\[([^\]]+)\]$/);
          if (match) {
            const citationKey = match[1];
            const citation = citationMap.get(citationKey);
            const isSelected = selectedCitation === citationKey;
            
            return (
              <button
                key={index}
                className={`inline-flex items-center gap-1 px-2 py-0.5 mx-1 text-xs rounded-md transition-all ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
                onClick={() => handleCitationClick(citationKey)}
                title={citation ? `View: ${citation.text}` : `View citation: ${citationKey}`}
              >
                <FileText className="w-3 h-3" />
                <span className="font-medium">{citationKey.replace(/_/g, ' ')}</span>
              </button>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  const renderValue = (value: any, path: string = ''): React.ReactElement => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">Not specified</span>;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      if (value.value !== undefined) {
        // This is a field with value and citations
        return (
          <span>
            {renderCitationText(String(value.value))}
          </span>
        );
      }
      
      // Regular object
      return (
        <div className="ml-4 space-y-2">
          {Object.entries(value).map(([key, val]) => (
            <div key={key}>
              <span className="font-medium text-gray-700">{key.replace(/_/g, ' ')}:</span>{' '}
              {renderValue(val, `${path}.${key}`)}
            </div>
          ))}
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <ul className="ml-4 list-disc list-inside space-y-1">
          {value.map((item, index) => (
            <li key={index}>{renderValue(item, `${path}[${index}]`)}</li>
          ))}
        </ul>
      );
    }

    // Check if the value contains citation markers
    if (typeof value === 'string' && value.includes('[') && value.includes(']')) {
      return <div className="inline">{renderCitationText(value)}</div>;
    }

    return <span>{String(value)}</span>;
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
        <CardContent className="space-y-3">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="border-b last:border-0 pb-3 last:pb-0">
              <h4 className="font-semibold text-sm text-gray-700 mb-1">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h4>
              <div className="text-sm leading-relaxed">{renderValue(value, key)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Summary */}
      <div className="w-1/2 border-r border-gray-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Document Summary</h2>
              <p className="text-sm text-gray-600 mt-1">
                JSON: {jsonFile} | Source: {sourceFile}
              </p>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                ← New Document
              </button>
            )}
          </div>
          {selectedCitation && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary">
                Viewing: {selectedCitation.replace(/_/g, ' ')}
              </Badge>
              <button
                onClick={clearHighlight}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear highlight
              </button>
            </div>
          )}
        </div>
        
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-4">
            {renderSection('Key Fields', result.KEY_FIELDS)}
            {renderSection('Summary Paragraphs', result.SUMMARY_PARAGRAPHS)}
            {renderSection('Details', result.DETAILS)}
            
            {/* Citations section for reference */}
            {result.citations && result.citations.length > 0 && (
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Citations Reference</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    Click any citation button above to highlight text in the original document
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.citations.map((citation, index) => (
                      <div
                        key={index}
                        className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                          selectedCitation === citation.class
                            ? 'bg-blue-100 border-blue-300 border'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => citation.class && handleCitationClick(citation.class)}
                      >
                        <span className="font-semibold text-blue-700">[{citation.class}]</span>
                        {citation.location && (
                          <span className="ml-2 text-gray-500">
                            Position: {citation.location.start}-{citation.location.end}
                          </span>
                        )}
                        <div className="mt-1 text-gray-600 line-clamp-2">
                          "{citation.text}"
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Original Text Document */}
      <div className="w-1/2 bg-white overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Original Document</h2>
          <p className="text-sm text-gray-600 mt-1">Plain text (.txt) file</p>
        </div>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div 
            ref={textViewerRef}
            className="p-6 font-mono text-sm whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: highlightedText }}
          />
        </ScrollArea>
      </div>
    </div>
  );
};

export default ResultsView;