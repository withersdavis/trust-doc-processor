import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { FileUpload } from './components/FileUpload';
import ResultsView from './components/ResultsView';
import { FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent } from './components/ui/card';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface ProcessingResult {
  metadata: {
    processed_date: string;
    original_filename: string;
    processing_time_ms: number;
  };
  extraction: {
    KEY_FIELDS: any;
    SUMMARY_PARAGRAPHS: any;
    DETAILS: any;
    citations?: Array<any>;
  };
  citations: Array<{
    text: string;
    class: string;
    location?: {
      start: number;
      end: number;
      length: number;
    };
    confidence?: number;
    attributes?: any;
  }>;
}

function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [originalText, setOriginalText] = useState<string>('');

  // Check if we have URL parameters for a job
  useEffect(() => {
    const jsonFile = searchParams.get('json');
    const sourceFile = searchParams.get('source');
    
    if (jsonFile && sourceFile) {
      // Load the existing job data
      loadJobData(jsonFile, sourceFile);
    }
  }, [searchParams]);

  const loadJobData = async (jsonFile: string, sourceFile: string) => {
    try {
      // Check if jsonFile is a full path or just a filename
      if (jsonFile.startsWith('/')) {
        // This is a full file path - extract the filename and load from server
        const filename = jsonFile.split('/').pop();
        if (!filename) {
          throw new Error('Invalid file path');
        }
        
        // Load the JSON file from the server's static results directory
        const jsonResponse = await fetch(`${API_URL}/results/${filename}`);
        if (!jsonResponse.ok) {
          throw new Error('Failed to load result file');
        }
        const jsonData = await jsonResponse.json();
        setResult(jsonData);
        
        // For local files, we need to load the original text differently
        // Since we can't load it from the server, we'll use the source file ID if available
        if (sourceFile.startsWith('file_')) {
          // This looks like a file ID from the server
          const textResponse = await fetch(`${API_URL}/api/files/${sourceFile}/text`);
          if (textResponse.ok) {
            const textData = await textResponse.text();
            setOriginalText(textData);
          } else {
            // If we can't load the original text, set a placeholder
            setOriginalText('Original document text not available for local file viewing.');
          }
        } else {
          setOriginalText('Original document text not available for local file viewing.');
        }
      } else {
        // This is a filename - use the API
        const jsonResponse = await fetch(`${API_URL}/api/results/${jsonFile}`);
        if (!jsonResponse.ok) {
          throw new Error('Failed to load result file');
        }
        const jsonData = await jsonResponse.json();
        setResult(jsonData);

        // Fetch the original text file
        const textResponse = await fetch(`${API_URL}/api/files/${sourceFile}/text`);
        if (!textResponse.ok) {
          throw new Error('Failed to load source file');
        }
        const textData = await textResponse.text();
        setOriginalText(textData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job data');
      console.error('Error loading job:', err);
    }
  };

  const handleFileSelect = async (file: File) => {
    // Check if file is .txt
    if (!file.name.endsWith('.txt')) {
      setError('Please upload a .txt file only');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const uploadData = await uploadResponse.json();

      // Process file
      const processResponse = await fetch(
        `${API_URL}/api/process/${uploadData.fileId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || 'Failed to process document');
      }

      const processData = await processResponse.json();
      
      // Navigate to the results page with URL parameters
      navigate(`/?json=${processData.filename}&source=${uploadData.fileId}`);
      
      // Set the result and original text
      setResult(processData.result);
      
      // Read the original text file
      const textResponse = await fetch(`${API_URL}/api/files/${uploadData.fileId}/text`);
      if (textResponse.ok) {
        const text = await textResponse.text();
        setOriginalText(text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Show results view if we have data
  if (result && originalText) {
    const jsonFile = searchParams.get('json') || '';
    const sourceFile = searchParams.get('source') || '';
    
    return (
      <ResultsView
        result={{
          ...result.extraction,
          citations: result.citations
        }}
        originalText={originalText}
        jsonFile={jsonFile}
        sourceFile={sourceFile}
        onBack={() => {
          navigate('/');
          setResult(null);
          setOriginalText('');
          setError(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Trust Document Processor
              </h1>
              <p className="text-sm text-gray-600">
                Extract structured information from trust documents (.txt files only)
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-destructive">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />

        {isProcessing && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Processing document with LangExtract (Gemini)...</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              This may take a few moments depending on document size
            </p>
          </div>
        )}
      </main>

      <footer className="mt-auto py-6 text-center text-sm text-gray-500">
        <p>
          Powered by LangExtract with Gemini • Results saved to /results folder
        </p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;