# Trust Document Processor - Project Plan

## Overview
A web application that processes trust documents using LangExtract to extract structured information with detailed citations. The app uses a pre-defined trust template and parameters for consistent extraction.

## Architecture

### Tech Stack
- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Processing**: LangExtract library
- **Backend**: Node.js Express server for file handling and LangExtract processing

### Core Features
1. **File Upload**: Drag-and-drop or click-to-upload interface
2. **Document Processing**: Using LangExtract with trust_template.json
3. **Results Display**: Three-section JSON output with citations
4. **Results Storage**: Automatic saving to /results folder

## Project Structure
```
/s3
├── /client                 # React frontend
│   ├── /src
│   │   ├── /components    # React components
│   │   ├── /lib          # Utility functions
│   │   └── App.tsx       # Main app component
│   └── package.json
├── /server                # Node.js backend
│   ├── /routes           # API endpoints
│   ├── /services         # Business logic
│   └── server.js         # Express server
├── /lib                   # Shared configuration
│   ├── langExtract_params.json
│   └── trust_template.json
├── /results              # Processed document results
└── /docs                 # Documentation

```

## Implementation Phases

### Phase 1: Project Setup
- Initialize React app with TypeScript
- Configure Tailwind CSS
- Install and setup shadcn/ui
- Create Express server

### Phase 2: File Upload System
- Create upload component with shadcn/ui
- Implement drag-and-drop functionality
- Add file validation (PDF, DOCX, TXT)
- Handle file storage temporarily

### Phase 3: LangExtract Integration
- Configure LangExtract with trust template
- Apply parameters from langExtract_params.json
- Implement processing endpoint
- Handle extraction with citations

### Phase 4: Results Management
- Create results display component
- Format JSON output with three sections
- Save results to /results folder
- Add download functionality

### Phase 5: UI Polish
- Error handling and loading states
- Progress indicators during processing
- Results preview and formatting
- Responsive design optimization

## API Endpoints

### POST /api/upload
- Accepts: multipart/form-data
- Returns: File ID and upload confirmation

### POST /api/process/:fileId
- Triggers LangExtract processing
- Returns: Processing job ID

### GET /api/results/:jobId
- Returns: Processed JSON results with citations

### GET /api/results/list
- Returns: List of all processed documents

## Data Flow
1. User uploads document via frontend
2. File sent to backend server
3. Server processes with LangExtract using trust template
4. Results saved to /results folder
5. JSON response sent to frontend
6. Frontend displays formatted results

## Key Constraints
- Never modify LangExtract results
- Always use trust_template.json structure
- Apply all parameters from langExtract_params.json
- Preserve all citations from extraction
- Store all results in /results folder

## Success Criteria
- ✅ File upload works for PDF/DOCX/TXT
- ✅ LangExtract processes with trust template
- ✅ Results include three detailed sections
- ✅ All citations preserved and displayed
- ✅ Results saved to /results folder
- ✅ Clean, responsive UI with Tailwind/shadcn