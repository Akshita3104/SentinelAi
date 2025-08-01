# Project Plan: Sentinel AI - SDN Powered Self-Healing Security Framework

## Notes
- Project title: "Sentinel AI - An AI-driven SDN Powered, Self-Healing Security Framework with GUI Isolation".
- Extracted objectives and timeline from Group_24.pdf.
- Project involves anomaly detection, automated response, network simulation, integration with SDN, and self-healing modules.
- Includes both technical development and procedural documentation.
- In-depth research conducted on AI-driven SDN security frameworks, self-healing networks, and anomaly detection. Key components identified: real-time monitoring, predictive analytics, automated recovery, continuous learning, and centralized SDN management.
- Challenges include integration with legacy systems, need for automation frameworks, and trust in autonomous operations.

---

## Execution Guide: Frontend, Backend, Model

---

### 1. Frontend
#### What is Needed
- **Purpose:** Provide a secure, interactive UI for real-time network monitoring, anomaly alerts, visualization, and manual override controls. Ensure GUI isolation to protect against UI-based attacks.
- **Requirements:**
  - Real-time dashboard for network state, alerts, logs, and control actions
  - Visualization of network topology and anomaly events
  - Secure authentication (login, role-based access)
  - GUI isolation (sandboxing, CSP, strict input validation)
  - Responsive design for desktop and tablet

#### How to Build
- **Tech Stack:**
  - Framework: React.js (recommended), or Angular/Vue.js
  - Visualization: D3.js, Chart.js, Plotly
  - State Management: Redux (React), Vuex (Vue)
  - Styling: Tailwind CSS, Material UI, or Bootstrap
  - Security: CSP headers, sandboxed iframes, strict CORS, JWT/OAuth2 authentication
  - Communication: Axios or Fetch for REST API calls
- **Procedure:**
  1. Design wireframes for dashboard, alerts, logs, and manual controls
  2. Scaffold project with chosen frontend framework
  3. Implement authentication and session management
  4. Develop reusable components for:
     - Network topology visualization
     - Real-time alerts and logs
     - Manual override controls (e.g., isolate node, trigger recovery)
  5. Integrate API calls to backend for live data and control
  6. Enforce GUI isolation: sandbox critical components, validate all user input, apply CSP
  7. Add role-based access (admin/operator)
  8. Test for usability, accessibility, and security (including penetration tests)

#### Outcome
- A secure, responsive dashboard for real-time network monitoring and control
- Visualizations of network state, anomalies, and recovery actions
- Secure, isolated GUI minimizing attack surface and unauthorized actions

---

### 2. Backend
#### What is Needed
- **Purpose:** Orchestrate SDN control, integrate AI/ML models, manage self-healing logic, expose REST APIs for frontend and model communication, and handle security and data persistence.
- **Requirements:**
  - SDN controller integration (Ryu, OpenDaylight, ONOS)
  - RESTful API endpoints for frontend and model
  - Secure database for logs, configs, and user data
  - Self-healing orchestration logic
  - Authentication, authorization, and audit logging

#### How to Build
- **Tech Stack:**
  - Language: Python (preferred, for SDN/AI integration), or Node.js
  - Framework: Flask or FastAPI (Python), Express (Node.js)
  - SDN Controller: Ryu, OpenDaylight, or ONOS
  - Database: PostgreSQL or MongoDB
  - Security: HTTPS, JWT/OAuth2, RBAC, input validation
- **Procedure:**
  1. Set up SDN controller and connect to simulated/test network (e.g., Mininet)
  2. Scaffold backend API with Flask/FastAPI (or Express)
  3. Implement RESTful endpoints for:
     - Network state/query
     - Anomaly alerts
     - Manual override actions
     - Model inference requests
  4. Integrate with SDN controller for flow management and network commands
  5. Connect to database for logs, user management, and configs
  6. Implement self-healing logic (e.g., automated rerouting, quarantine, recovery)
  7. Secure all endpoints (authentication, authorization, input validation)
  8. Add audit logging for all sensitive actions
  9. Write unit and integration tests
  10. Provide API documentation (Swagger/OpenAPI)

#### Outcome
- A robust backend that manages SDN, AI/ML, and user interactions
- Secure, documented REST APIs for all modules
- Automated, auditable orchestration of network and self-healing actions

---

### 3. Model (AI/ML)
#### What is Needed
- **Purpose:** Detect network anomalies, provide predictive analytics for self-healing, and enable continuous learning from new data.
- **Requirements:**
  - Labeled network traffic datasets (e.g., CICIDS, UNSW-NB15, or simulated)
  - Feature extraction and preprocessing pipelines
  - ML/DL models for anomaly detection (Random Forest, SVM, CNN, RNN, Autoencoders)
  - Model serving (API or direct backend integration)
  - Continuous learning/retraining hooks

#### How to Build
- **Tech Stack:**
  - Language: Python
  - Libraries: scikit-learn, TensorFlow, PyTorch, Keras, pandas, numpy
  - Tools: Jupyter notebooks, MLflow (for experiment tracking)
- **Procedure:**
  1. Collect and preprocess network traffic data (cleaning, normalization, feature engineering)
  2. Train baseline models (Random Forest, SVM, CNN, etc.) for anomaly detection
  3. Evaluate models (cross-validation, ROC-AUC, F1-score)
  4. Optimize with hyperparameter tuning/metaheuristics
  5. Export best-performing models (Pickle, ONNX, TensorFlow SavedModel)
  6. Develop model inference API (Flask/FastAPI) or direct Python integration with backend
  7. Implement hooks for retraining with new data (continuous learning)
  8. Document model architecture, training process, and results

#### Outcome
- Trained, validated anomaly detection models ready for deployment
- Model APIs or modules integrated with backend for real-time inference
- Continuous learning pipeline for adaptive, evolving security

---

### 3. Model (AI/ML)
**What is needed:**
- Anomaly detection model(s) for network traffic, predictive analytics for self-healing, continuous learning

**Tech Stack:**
- Language: Python
- Libraries: scikit-learn, TensorFlow, PyTorch, Keras, pandas, numpy
- Datasets: CICIDS, UNSW-NB15, or simulated SDN traffic
- Tools: Jupyter notebooks for prototyping, MLflow for experiment tracking

**How to build:**
- Collect and preprocess network traffic data (cleaning, feature extraction)
- Train baseline models (Random Forest, SVM, CNN, RNN, Autoencoders) for anomaly detection
- Evaluate and optimize models (cross-validation, hyperparameter tuning)
- Export trained models (Pickle, ONNX, TensorFlow SavedModel)
- Develop inference API (Flask/FastAPI) or integrate directly with backend
- Implement retraining/continuous learning hooks for self-healing feedback

**Outcome:**
- Trained, validated anomaly detection model(s) ready for deployment
- Model APIs or modules integrated with backend for real-time inference
- Continuous learning pipeline for adaptive security

---
