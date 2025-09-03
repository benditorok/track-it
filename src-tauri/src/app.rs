use crate::database;
use crate::domains::tracker::{
    TrackerEntryCreateDto, TrackerEntryLineCreateDto, TrackerEntryLineUpdateDto,
    TrackerEntryLineViewDto, TrackerEntryViewDto, TrackerService, TrackerServiceTrait,
};
use chrono::{Local, Utc};
use sqlx::SqlitePool;
use std::sync::Arc;
use tokio::sync::mpsc::{self, UnboundedReceiver, UnboundedSender};

enum InitMessage {
    DatabaseError(String),
    Initialized(ServiceCollection),
}

#[derive(Debug)]
enum TrackerEntryUpdateMessage {
    Created(TrackerEntryViewDto),
    Updated(TrackerEntryViewDto),
}

#[derive(Debug)]
enum TrackerEntryLineUpdateMessage {
    Created(TrackerEntryLineViewDto),
    Updated(TrackerEntryLineViewDto),
}

struct ServiceCollection {
    pool: SqlitePool,
    tracker_service: Arc<dyn TrackerServiceTrait>,
}

/// We derive Deserialize/Serialize so we can persist app state on shutdown.
#[derive(serde::Deserialize, serde::Serialize)]
#[serde(default)] // if we add new fields, give them default values when deserializing old state
pub struct TrackerApp {
    #[serde(skip)]
    init_receiver: Option<UnboundedReceiver<InitMessage>>,
    #[serde(skip)]
    db_init_error: Option<String>,

    #[serde(skip)]
    db_pool: Option<SqlitePool>,
    #[serde(skip)]
    tracker_service: Option<Arc<dyn TrackerServiceTrait>>,

    #[serde(skip)]
    tracker_entries: Vec<TrackerEntryViewDto>,
    #[serde(skip)]
    selected_tracker_entry: Option<TrackerEntryViewDto>,
    #[serde(skip)]
    tracker_entry_update: (
        UnboundedSender<TrackerEntryUpdateMessage>,
        UnboundedReceiver<TrackerEntryUpdateMessage>,
    ),

    #[serde(skip)]
    tracker_entry_lines: Vec<TrackerEntryLineViewDto>,
    #[serde(skip)]
    selected_tracker_entry_lines: Option<TrackerEntryLineViewDto>,
    #[serde(skip)]
    tracker_line_update: (
        UnboundedSender<TrackerEntryLineUpdateMessage>,
        UnboundedReceiver<TrackerEntryLineUpdateMessage>,
    ),

    // UI state
    new_tracker_label: String,
    new_line_desc: String,

    #[serde(skip)]
    active_line: Option<TrackerEntryLineViewDto>, // Currently running line
}

impl Default for TrackerApp {
    fn default() -> Self {
        let (tracker_entry_update_sender, tracker_entry_update_receiver) =
            mpsc::unbounded_channel();

        let (tracker_line_update_sender, tracker_line_update_receiver) = mpsc::unbounded_channel();

        Self {
            db_pool: None,
            init_receiver: None,
            db_init_error: None,
            tracker_service: None,
            tracker_entries: Vec::new(),
            selected_tracker_entry: None,
            tracker_entry_lines: Vec::new(),
            selected_tracker_entry_lines: None,
            tracker_entry_update: (tracker_entry_update_sender, tracker_entry_update_receiver),
            tracker_line_update: (tracker_line_update_sender, tracker_line_update_receiver),
            new_tracker_label: String::new(),
            new_line_desc: String::new(),
            active_line: None,
        }
    }
}

impl TrackerApp {
    /// Called once before the first frame.
    pub fn new(cc: &eframe::CreationContext<'_>) -> Self {
        // This is also where you can customize the look and feel of egui using
        // `cc.egui_ctx.set_visuals` and `cc.egui_ctx.set_fonts`.

        // Load previous app state (if any).
        // Note that you must enable the `persistence` feature for this to work.
        let mut app: Self = if let Some(storage) = cc.storage {
            eframe::get_value(storage, eframe::APP_KEY).unwrap_or_default()
        } else {
            Default::default()
        };

        // Create channel for database communication
        let (init_sender, init_receiver) = mpsc::unbounded_channel();
        app.init_receiver = Some(init_receiver);

        // Initialize database in a separate thread
        let ctx = cc.egui_ctx.clone();

        // Initialize the database asynchronously
        tokio::spawn(async move {
            match database::initialize_database().await {
                Ok(pool) => {
                    log::info!("Database initialized successfully");
                    let collection = ServiceCollection {
                        tracker_service: TrackerService::create_service(pool.clone()),
                        pool,
                    };
                    if init_sender
                        .send(InitMessage::Initialized(collection))
                        .is_err()
                    {
                        log::warn!("Failed to send initialized message");
                    }
                    ctx.request_repaint(); // Trigger UI update
                }
                Err(e) => {
                    log::error!("Database initialization failed: {e}");
                    if init_sender
                        .send(InitMessage::DatabaseError(e.to_string()))
                        .is_err()
                    {
                        log::warn!("Failed to send database error message");
                    }
                    ctx.request_repaint(); // Trigger UI update
                }
            }
        });

        app
    }
}

impl TrackerApp {
    /// Load all trackers from the database
    fn load_trackers(&self) {
        if let Some(service) = &self.tracker_service {
            let service_clone = service.clone();
            let sender = self.tracker_entry_update.0.clone();

            tokio::spawn(async move {
                match service_clone.get_trackers().await {
                    Ok(trackers) => {
                        for tracker in trackers {
                            if let Err(e) = sender.send(TrackerEntryUpdateMessage::Created(tracker))
                            {
                                log::error!("Failed to send tracker update: {e}");
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("Failed to load trackers: {e}");
                    }
                }
            });
        }
    }

    /// Load tracker lines for a specific tracker
    fn load_tracker_lines(&self) {
        if let Some(service) = &self.tracker_service {
            let service_clone = service.clone();
            let sender = self.tracker_line_update.0.clone();

            tokio::spawn(async move {
                match service_clone.get_tracker_lines().await {
                    Ok(lines) => {
                        for line in lines {
                            if let Err(e) =
                                sender.send(TrackerEntryLineUpdateMessage::Created(line))
                            {
                                log::error!("Failed to send tracker line update: {e}");
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("Failed to load tracker lines: {e}");
                    }
                }
            });
        }
    }

    /// Create a new tracker entry
    fn create_tracker(&self, label: String) {
        if let Some(service) = &self.tracker_service {
            let service_clone = service.clone();
            let sender = self.tracker_entry_update.0.clone();
            let dto = TrackerEntryCreateDto {
                label,
                ..Default::default()
            };

            tokio::spawn(async move {
                match service_clone.create_tracker(dto).await {
                    Ok(created_entry) => {
                        if let Err(e) =
                            sender.send(TrackerEntryUpdateMessage::Created(created_entry))
                        {
                            log::error!("Failed to send tracker creation update: {e}");
                        }
                    }
                    Err(e) => {
                        log::error!("Failed to create tracker: {e}");
                    }
                }
            });
        }
    }

    /// Start a new tracking line
    fn start_tracking(&self, desc: String) {
        if let (Some(selected), Some(service)) =
            (&self.selected_tracker_entry, &self.tracker_service)
        {
            let service_clone = service.clone();
            let sender = self.tracker_line_update.0.clone();
            let dto = TrackerEntryLineCreateDto {
                entry_id: selected.id,
                desc,
                ..Default::default()
            };

            tokio::spawn(async move {
                match service_clone.start_tracking(dto).await {
                    Ok(created_line) => {
                        if let Err(e) =
                            sender.send(TrackerEntryLineUpdateMessage::Created(created_line))
                        {
                            log::error!("Failed to send line creation update: {e}");
                        }
                    }
                    Err(e) => {
                        log::error!("Failed to start tracking: {e}");
                    }
                }
            });
        }
    }

    /// Stop the currently active tracking line
    fn stop_tracking(&mut self) {
        if let (Some(line), Some(service)) = (self.active_line.take(), &self.tracker_service) {
            let service_clone = service.clone();
            let sender = self.tracker_line_update.0.clone();
            let dto = TrackerEntryLineUpdateDto {
                id: line.id,
                entry_id: line.entry_id,
                desc: line.desc.clone(),
                started_at: line.started_at,
                ended_at: Some(Utc::now()),
                ..Default::default()
            };

            tokio::spawn(async move {
                match service_clone.update_tracked(dto).await {
                    Ok(updated) => {
                        if let Err(e) = sender.send(TrackerEntryLineUpdateMessage::Updated(updated))
                        {
                            log::error!("Failed to send line update: {e}");
                        }
                    }
                    Err(e) => {
                        log::error!("Failed to stop tracking: {e}");
                    }
                }
            });
        }
    }
}

impl eframe::App for TrackerApp {
    /// Called by the framework to save state before shutdown.
    fn save(&mut self, storage: &mut dyn eframe::Storage) {
        eframe::set_value(storage, eframe::APP_KEY, self);
    }

    fn on_exit(&mut self, _gl: Option<&eframe::glow::Context>) {
        // Stop tracking of the active item (if any)
        self.stop_tracking();
    }

    /// Called each time the UI needs repainting, which may be many times per second.
    #[expect(clippy::too_many_lines)]
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Check for initialization messages
        let mut should_initialize = false;
        if let Some(db_receiver) = &mut self.init_receiver {
            while let Ok(msg) = db_receiver.try_recv() {
                match msg {
                    InitMessage::Initialized(sc) => {
                        log::info!("Database initialized successfully");
                        self.tracker_service = Some(sc.tracker_service);
                        self.db_pool = Some(sc.pool);
                        self.db_init_error = None;

                        should_initialize = true;
                    }
                    InitMessage::DatabaseError(error) => {
                        log::error!("Database initialization failed: {error}");
                        self.db_init_error = Some(error);
                        self.db_pool = None;
                    }
                }
            }
        }

        if should_initialize {
            self.load_trackers();
            self.load_tracker_lines();
        }

        // Handle updates
        // Tracker entry updates
        while let Ok(msg) = self.tracker_entry_update.1.try_recv() {
            match msg {
                TrackerEntryUpdateMessage::Created(entry)
                | TrackerEntryUpdateMessage::Updated(entry) => {
                    self.tracker_entries.push(entry);
                }
            }
        }
        // Tracker line updates
        while let Ok(msg) = self.tracker_line_update.1.try_recv() {
            match msg {
                TrackerEntryLineUpdateMessage::Created(line) => {
                    // Set as active line if it doesn't have an end time
                    if line.ended_at.is_none() {
                        self.active_line = Some(line.clone());
                    }

                    // Add to tracker lines
                    self.tracker_entry_lines.push(line);
                }
                TrackerEntryLineUpdateMessage::Updated(line) => {
                    // Update active line if it matches
                    if let Some(active) = &self.active_line {
                        if active.id == line.id {
                            if line.ended_at.is_some() {
                                self.active_line = None; // Line was stopped
                            } else {
                                self.active_line = Some(line.clone());
                            }
                        }
                    }

                    // Update in tracker lines
                    if let Some(existing_line) = self
                        .tracker_entry_lines
                        .iter_mut()
                        .find(|l| l.id == line.id)
                    {
                        *existing_line = line;
                    }
                }
            }
        }

        // Put your widgets into a `SidePanel`, `TopBottomPanel`, `CentralPanel`, `Window` or `Area`.
        // For inspiration and more examples, go to https://emilk.github.io/egui

        egui::TopBottomPanel::top("top_panel").show(ctx, |ui| {
            // The top panel is often a good place for a menu bar:

            egui::MenuBar::new().ui(ui, |ui| {
                // NOTE: no File->Quit on web pages!
                let is_web = cfg!(target_arch = "wasm32");
                if !is_web {
                    ui.menu_button("File", |ui| {
                        if ui.button("Quit").clicked() {
                            ctx.send_viewport_cmd(egui::ViewportCommand::Close);
                        }
                    });
                    ui.add_space(16.0);
                }

                egui::widgets::global_theme_preference_buttons(ui);
            });
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            // The central panel the region left after adding TopPanel's and SidePanel's
            ui.heading("Tracker App");

            // Database status
            ui.horizontal(|ui| {
                ui.label("Database Status:");
                if self.db_pool.is_some() {
                    ui.colored_label(egui::Color32::GREEN, "Connected");
                } else if let Some(error) = &self.db_init_error {
                    ui.colored_label(egui::Color32::RED, format!("Error: {error}"));
                } else {
                    ui.colored_label(egui::Color32::YELLOW, "Initializing...");
                }
            });

            ui.separator();

            // Only show tracker UI if database is connected
            if self.db_pool.is_none() {
                ui.label("Waiting for database connection...");
                return;
            }

            ui.heading("Trackers");

            // Create new tracker section
            ui.group(|ui| {
                ui.label("Create New Tracker:");
                ui.horizontal(|ui| {
                    ui.text_edit_singleline(&mut self.new_tracker_label);
                    if ui.button("Create").clicked() && !self.new_tracker_label.is_empty() {
                        self.create_tracker(self.new_tracker_label.clone());
                        self.new_tracker_label.clear();
                    }
                });
            });

            ui.separator();

            egui::scroll_area::ScrollArea::vertical().show(ui, |ui| {
                // List of trackers
                ui.label("Existing Trackers:");

                // Vertical split with size 70%/30%
                let available_width = ui.available_width();
                let left_width = available_width * 0.7;
                let right_width = available_width * 0.3;
                ui.horizontal(|ui| {
                    // Left panel (70%)
                    ui.allocate_ui_with_layout(
                        egui::vec2(left_width, ui.available_height()),
                        egui::Layout::top_down(egui::Align::Min),
                        |ui| {
                            let mut selected_tracker_id = None;

                            for tracker in &self.tracker_entries {
                                let is_selected = self
                                    .selected_tracker_entry
                                    .as_ref()
                                    .is_some_and(|selected| selected.id == tracker.id);

                                ui.horizontal(|ui| {
                                    if ui.selectable_label(is_selected, &tracker.label).clicked() {
                                        selected_tracker_id = Some(tracker.clone());
                                    }

                                    // Lines count
                                    let line_count = self
                                        .tracker_entry_lines
                                        .iter()
                                        .filter(|line| line.entry_id == tracker.id)
                                        .count();
                                    ui.label(format!("Lines: {line_count}"));
                                });
                            }

                            if self.tracker_entries.is_empty() {
                                ui.label("No trackers yet. Create one above!");
                            }

                            // Handle tracker selection outside the borrow
                            if let Some(tracker) = selected_tracker_id {
                                self.selected_tracker_entry = Some(tracker);
                            }
                        },
                    );

                    // Right panel (30%)
                    ui.allocate_ui_with_layout(
                        egui::vec2(right_width, ui.available_height()),
                        egui::Layout::top_down(egui::Align::Min),
                        |ui| {
                            // Current tracking status
                            if let Some(active) = &self.active_line {
                                ui.colored_label(egui::Color32::GREEN, "⏱ Currently tracking:");
                                ui.label(&active.desc);
                                ui.label(format!(
                                    "Started: {}",
                                    active.started_at.with_timezone(&Local).format("%H:%M:%S")
                                ));
                                if ui.button("Stop Tracking").clicked() {
                                    self.stop_tracking();
                                }
                            }
                        },
                    );
                });

                ui.separator();

                if self.selected_tracker_entry.is_some() && self.active_line.is_none() {
                    ui.label("Start new tracking:");
                    ui.horizontal(|ui| {
                        ui.text_edit_singleline(&mut self.new_line_desc);
                        if ui.button("Start").clicked() && !self.new_line_desc.is_empty() {
                            self.start_tracking(self.new_line_desc.clone());
                            self.new_line_desc.clear();
                        }
                    });
                }

                ui.vertical(|ui| {
                    ui.heading("Tracking Lines");

                    if let Some(selected) = &self.selected_tracker_entry {
                        ui.label(format!("For tracker: {}", selected.label));

                        // List of tracking lines
                        ui.label("History:");

                        for line in &self.tracker_entry_lines {
                            tracker_line_component(ui, line);
                            ui.add_space(5.0);
                        }

                        if self.tracker_entry_lines.is_empty() {
                            ui.label("No tracking lines yet. Start tracking above!");
                        }
                    } else {
                        ui.label("Select a tracker to view and create tracking lines.");
                    }
                });
            });

            #[cfg(debug_assertions)]
            egui::TopBottomPanel::bottom("bottom_panel").show(ctx, |ui| {
                ui.horizontal(|ui| {
                    egui::warn_if_debug_build(ui);
                });
            });
        });
    }
}

fn tracker_line_component(ui: &mut egui::Ui, line: &TrackerEntryLineViewDto) {
    ui.group(|ui| {
        ui.label(&line.desc);
        ui.horizontal(|ui| {
            ui.label(format!(
                "Started: {}",
                line.started_at
                    .with_timezone(&Local)
                    .format("%Y-%m-%d %H:%M")
            ));

            if let Some(ended) = line.ended_at {
                ui.label(format!(
                    "Ended: {}",
                    ended.with_timezone(&Local).format("%H:%M")
                ));
                let duration = (ended - line.started_at).num_seconds();
                let hours = duration / 3600;
                let minutes = (duration % 3600) / 60;
                let seconds = duration % 60;
                ui.label(format!("Duration: {hours}h {minutes}m {seconds}s"));
            } else {
                ui.colored_label(egui::Color32::GREEN, "Running...");
            }
        });
    });
}
