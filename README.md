# track-it

A simple, efficient time tracking application built with Tauri, React, and Rust.

## Features

### Core Functionality
- **Multiple Trackers**: Create and manage multiple tracking categories
- **Pausable Sessions**: Stop and resume tracking on the same task
- **Session History**: View all tracking sessions with duration calculations
- **Today Filter**: Filter history to show only today's work
- **Auto-stop on Exit**: Automatically stops all active tracking when closing the app

### Session Management
- Each tracking line can have multiple duration sessions
- Resume previous tasks to continue tracking
- View total time across all sessions
- Individual session start/end times displayed

### Data Management
- SQLite database for persistent storage
- Soft delete functionality
- Clear all data option
- Automatic migration system

## Technology Stack

- **Frontend**: React, TypeScript, Ant Design
- **Backend**: Rust, Tauri
- **Database**: SQLite with sqlx
- **Build**: Vite

## Usage

### Creating a Tracker
1. Enter a tracker name in the left panel
2. Click "Create" to add a new tracker

### Starting Tracking
1. Select a tracker from the list
2. Enter a task description
3. Click "Start" to begin tracking

### Managing Sessions
- **Stop**: Pause the current tracking session
- **Resume**: Continue tracking on a stopped task
- **Delete**: Remove a tracking entry

### Viewing History
- Use "All" to view complete tracking history
- Use "Today" to filter only today's sessions
- Each session shows start time, end time, and duration

## Development

### Prerequisites
- Rust (latest stable)
- Node.js / Deno
- Tauri CLI

### Running Locally
```bash
# Install dependencies
deno install

# Run in development mode
deno task tauri dev

# Run in development mode for Android
deno task tauri android dev

# Build for production
deno task tauri build
```

### Database Migrations
Migrations are located in `/migrations` and run automatically on app initialization.

## Architecture

### Backend (Rust)
- Domain-driven design with repository pattern
- Service layer for business logic
- SQLite database with async sqlx queries
- Native window lifecycle management

### Frontend (React)
- TypeScript for type safety
- Ant Design component library
- Nested data structure (Trackers > Lines > Durations)
- Real-time duration updates

### Data Model
```
TrackerEntry
  └── TrackerEntryLine[]
       └── TrackerEntryLineDuration[]
```

## License

MIT
