# Time Tracker Application

A modern, efficient time tracking application built with Tauri (Rust backend) and React (TypeScript frontend).

## Features

### 🎯 Core Functionality
- **Create Trackers**: Organize your time tracking by creating different trackers for projects, tasks, or activities
- **Start/Stop Tracking**: Begin and end time tracking sessions with descriptive labels
- **Real-time Duration**: See live duration updates for active tracking sessions
- **History Management**: View complete history of all tracking sessions
- **Data Persistence**: All data is stored locally in SQLite database

### 🏗️ Technical Architecture

#### Backend (Rust/Tauri)
- **Database**: SQLite with SQLx for type-safe database operations
- **Migrations**: Automated database schema management
- **Services**: Clean architecture with repository and service layers
- **Commands**: Tauri commands for frontend-backend communication
- **Storage**: Data stored in platform-appropriate user data directory

#### Frontend (React/TypeScript)
- **Modern React**: Hooks-based functional components
- **Type Safety**: Full TypeScript integration with proper interfaces
- **Responsive Design**: Mobile-friendly CSS Grid layout
- **Real-time Updates**: Live duration calculations and UI updates
- **State Management**: Local React state with useEffect for data loading

### 📊 Data Model

#### Tracker Entry
- Unique ID
- Label/Name
- Creation and update timestamps
- Soft delete support

#### Tracking Line
- Unique ID
- Reference to parent tracker
- Description of the activity
- Start time (automatic)
- End time (when stopped)
- Creation and update timestamps
- Soft delete support

### 🎨 User Interface

#### Main Layout
- **Left Panel**: List of all trackers with creation interface
- **Right Panel**: Selected tracker details and tracking history

#### Tracker Management
- Create new trackers with custom labels
- View tracker statistics (number of entries)
- Visual indicators for active tracking sessions
- Delete trackers with confirmation

#### Time Tracking
- Start new tracking sessions with descriptions
- Visual indication of running sessions
- One-click stop functionality
- Duration display in HH:MM:SS format
- Complete tracking history with timestamps

#### Visual Design
- Clean, modern interface
- Color-coded status indicators
- Responsive grid layout
- Smooth transitions and hover effects
- Consistent spacing and typography

### 🔧 Technical Implementation

#### Database Schema
```sql
-- Tracker entries (projects/categories)
CREATE TABLE tracker_entry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Individual tracking sessions
CREATE TABLE tracker_entry_line (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL REFERENCES tracker_entry(id),
    desc TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);
```

#### Tauri Commands
- `initialize_app`: Set up database and services
- `get_trackers`: Retrieve all tracker entries
- `create_tracker`: Create a new tracker
- `get_tracker_lines`: Get all tracking sessions
- `start_tracking`: Begin a new tracking session
- `stop_tracking`: End an active tracking session
- `delete_tracker`: Remove a tracker and all its data
- `delete_tracker_line`: Remove a specific tracking session

#### State Management
- Application state managed through React hooks
- Automatic data loading on initialization
- Real-time UI updates for tracking status
- Error handling with user feedback

### 🚀 Getting Started

#### Prerequisites
- Rust (latest stable)
- Node.js/Deno
- Tauri CLI

#### Development
```bash
# Clone the repository
git clone <repository-url>
cd track-it

# Install dependencies
deno install

# Run in development mode
deno task tauri dev
```

#### Building
```bash
# Build for production
deno task tauri build
```

### 📁 Project Structure
```
track-it/
├── src/                    # React frontend
│   ├── App.tsx            # Main application component
│   ├── App.css            # Styling
│   └── ...
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs         # Main library entry
│   │   ├── app.rs         # Tauri commands
│   │   ├── database.rs    # Database initialization
│   │   └── domains/       # Business logic
│   └── Cargo.toml         # Rust dependencies
├── migrations/            # Database migrations
└── package.json           # Frontend dependencies
```

### 🛠️ Key Features Implemented

#### Data Integrity
- Foreign key constraints
- Soft delete functionality
- Transaction safety
- Migration system

#### User Experience
- Intuitive interface design
- Real-time feedback
- Keyboard shortcuts (Enter to submit)
- Confirmation dialogs for destructive actions

#### Performance
- Efficient database queries
- Minimal re-renders in React
- Optimized CSS with modern properties
- Fast startup time

#### Cross-Platform
- Native desktop application
- Platform-appropriate data storage
- Consistent behavior across OS

### 🔮 Future Enhancements

Potential areas for expansion:
- Export functionality (CSV, JSON)
- Time tracking goals and targets
- Project categorization and tags
- Reporting and analytics
- Data sync across devices
- Timer notifications
- Keyboard shortcuts
- Dark/light theme toggle
- Backup and restore
- Integration with external tools

This application demonstrates modern desktop app development using Rust and React, providing a solid foundation for time tracking needs while maintaining excellent performance and user experience.