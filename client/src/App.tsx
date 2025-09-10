import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsDisplay } from './components/ResultsDisplay';
import ResultsView from './components/ResultsView';
import { ProcessingResult } from './types';
import { API_ENDPOINTS } from './config';
import './index.css';

function App() {
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [originalText, setOriginalText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const jsonFile = urlParams.get('json');
  const sourceFile = urlParams.get('source');

  // Load job data from URL parameters
  useEffect(() => {
    const loadJobData = async () => {
      if (jsonFile) {
        try {
          setIsLoading(true);
          setError(null);

          // Load JSON data
          const response = await fetch(`${API_ENDPOINTS.LOAD_JOB}?json=${encodeURIComponent(jsonFile)}`);
          if (!response.ok) {
            throw new Error(`Failed to load job data: ${response.status} ${response.statusText}`);
          }
          const jsonData = await response.json();

          // Load source text
          let sourceText = '';
          if (sourceFile) {
            const textResponse = await fetch(`${API_ENDPOINTS.LOAD_SOURCE}?source=${encodeURIComponent(sourceFile)}`);
            if (!textResponse.ok) {
              console.error('Failed to load source file:', textResponse.status, textResponse.statusText);
              sourceText = 'Original document text not available - file may have expired or been deleted.';
            } else {
              sourceText = await textResponse.text();
            }
          }

          // Wrap the data in the expected structure
          setResult({
            success: true,
            filename: sourceFile || 'Unknown file',
            result: jsonData
          });
          setOriginalText(sourceText);
        } catch (err) {
          console.error('Error loading job data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load job data');
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadJobData();
  }, [jsonFile, sourceFile]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(API_ENDPOINTS.UPLOAD, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      console.log('Upload response:', uploadData);

      // Process file - send fileId as URL parameter
      const processResponse = await fetch(`${API_ENDPOINTS.PROCESS}/${uploadData.fileId}`, {
        method: 'POST',
      });

      if (!processResponse.ok) {
        throw new Error(`Processing failed: ${processResponse.status} ${processResponse.statusText}`);
      }

      const processData = await processResponse.json();
      console.log('Process response:', processData);

      // Set the result with the full response structure
      setResult(processData);

      // Load original text using the fileId
      const textResponse = await fetch(`${API_ENDPOINTS.FILES_TEXT}/${uploadData.fileId}/text`);
      if (!textResponse.ok) {
        console.error('Failed to load source file:', textResponse.status, textResponse.statusText);
        setOriginalText('Original document text not available - file may have expired or been deleted.');
      } else {
        const text = await textResponse.text();
        setOriginalText(text);
      }
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while processing the file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setResult(null);
    setOriginalText('');
    setError(null);
    // Clear URL parameters
    window.history.replaceState({}, '', window.location.pathname);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing document...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show results view if we have data
  if (result && originalText) {
    const jsonFile = new URLSearchParams(window.location.search).get('json') || '';
    const sourceFile = new URLSearchParams(window.location.search).get('source') || '';

    return (
      <ResultsView
        result={result}
        originalText={originalText}
        jsonFile={jsonFile}
        sourceFile={sourceFile}
        onBack={handleBack}
      />
    );
  }

  // Show file upload if we have a result but no original text (for results display)
  if (result) {
    return (
      <ResultsDisplay
        result={result}
        filename={result.filename}
        onBack={handleBack}
      />
    );
  }

  // Show file upload by default
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Trust Document Processor
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Upload a trust document to extract structured information using AI
            </p>
          </div>
          <FileUpload onFileSelect={handleFileSelect} />
        </div>
      </div>
    </div>
  );
}

export default App;