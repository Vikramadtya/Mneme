.PHONY: dev debug build build-prod clean install

# Start the application in development mode
dev:
	npm run electron:dev

# Start the application in development mode (ready for debugging)
debug:
	NODE_ENV=development npm run electron:dev

# Run the standard build process (compiles TypeScript and Vite)
build:
	npm run build

# Build the final production application for macOS (creates DMG/ZIP)
build-prod:
	npm run build:mac

# Install dependencies
install:
	npm install

# Clean up build directories
clean:
	rm -rf dist dist-electron release
