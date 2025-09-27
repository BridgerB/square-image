# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Square Image is an automatic image processing service that watches the Pictures directory for new images and converts them to square PNG format with a white background. The application is built as a Node.js service using ES modules.

## Core Architecture

- **Single-file application**: `index.js` contains the entire application logic
- **File watcher**: Uses `chokidar` to monitor `~/Pictures` directory for new images
- **Image processing**: Uses `sharp` library for image transformations
- **Logging**: Maintains processing history in `processing-log.json`
- **File cleanup**: Uses `trash` library to safely delete original files after processing

## Key Components

### Image Processing Pipeline
1. **File detection**: Watches for `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.webp`, `.avif` files
2. **AVIF conversion**: First converts AVIF files to JPEG with 10% quality
3. **Square transformation**: Resizes images to square format using the largest dimension
4. **Background**: Adds white background and flattens transparency
5. **Output**: Saves as PNG with no compression
6. **Cleanup**: Moves original files to trash after successful processing

### Event Logging
All operations are logged to `processing-log.json` with timestamps, including:
- Service start/stop events
- Image conversions and processing
- Error events

## Development Commands

### Running the Application
```bash
npm start        # Start the image watcher service
npm run dev      # Same as npm start
node index.js    # Direct execution
```

### Nix Development
```bash
nix develop      # Enter development shell
nix run          # Run the packaged application
nix build        # Build the package
```

## Dependencies

- `chokidar`: File system watcher
- `sharp`: High-performance image processing
- `trash`: Safe file deletion

## Configuration

- **Watch directory**: `~/Pictures` (hardcoded)
- **Log file**: `processing-log.json` in project root
- **File stability**: 2-second wait before processing new files
- **JPEG quality**: 10% for AVIF conversions
- **PNG compression**: Level 0 (no compression)

## Important Notes

- The service runs continuously until manually stopped (Ctrl+C)
- Original files are moved to trash after successful processing
- Only processes image files with supported extensions
- Maintains complete processing history in JSON log
- Uses ES modules (type: "module" in package.json)
- Requires Node.js 18.0.0 or later