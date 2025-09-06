# Trust Document Processor

An AI-powered application that processes trust documents using LangExtract with Gemini to extract structured information with detailed citations.

## Features

- **File Upload**: Drag-and-drop or click-to-upload interface for trust documents
- **AI Processing**: Uses standard LangExtract framework with Gemini
- **Template-Based Extraction**: Uses predefined trust template for consistent extraction
- **Detailed Citations**: All extractions include source citations
- **Results Storage**: Automatically saves processed results to `/results` folder
- **Export Options**: Download or copy results as JSON

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js Express server with TypeScript
- **AI**: LangExtract framework with Gemini for document extraction
- **Storage**: Local file system for results

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm package manager
- Gemini API key

### Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies for both client and server:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Configure environment variables:

**Server (.env):**
```bash
cd ../server
# Edit .env file and add your Gemini API key
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

### Running the Application

1. Start the backend server:
```bash
cd server
npm run dev
```
The server will run on http://localhost:3001

2. In a new terminal, start the React frontend:
```bash
cd client
npm start
```
The app will open at http://localhost:3000

## Usage

1. Open the application at http://localhost:3000
2. Upload a trust document (PDF, DOCX, or TXT format)
3. Click "Process Document" to extract information
4. View the structured results with three sections:
   - KEY_FIELDS: Basic trust information
   - SUMMARY_PARAGRAPHS: Narrative summaries
   - DETAILS: Specific provisions and clauses
5. Results are automatically saved to `/results` folder
6. Download or copy the JSON results as needed

## File Structure

```
/s3
├── /client                 # React frontend
├── /server                # Node.js backend
├── /lib                   # Configuration files
│   ├── langExtract_params.json
│   └── trust_template.json
├── /results              # Processed results (auto-created)
└── /docs                 # Documentation
```

## API Endpoints

- `POST /api/upload` - Upload document
- `POST /api/process/:fileId` - Process uploaded document
- `GET /api/process/results` - List all results
- `GET /api/process/results/:filename` - Get specific result

## Important Notes

- Never modify the extraction results
- Always uses trust_template.json structure
- All parameters from langExtract_params.json are applied
- Results are preserved with all citations
- Currently supports text files; PDF/DOCX support requires additional libraries

## Troubleshooting

### API Key Issues
- Ensure GEMINI_API_KEY is set in server/.env
- Check API key is valid and has proper permissions

### Processing Errors
- Verify file format is supported
- Check file size is under 10MB
- Ensure network connectivity for API calls

### CORS Issues
- Frontend should run on port 3000
- Backend should run on port 3001
- Check REACT_APP_API_URL in client/.env

## Development

See `/docs` folder for detailed development instructions and project plan.