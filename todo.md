# TODO: Sentinel AI – AI-driven SDN Powered Self-Healing Security Framework with GUI Isolation

## 1. Project Setup & Planning
- [ ] Set up version control repository (e.g., GitHub)
- [ ] Define project scope, objectives, and success criteria
- [ ] Assign roles and responsibilities to team members
- [ ] Establish documentation standards and project management tools
- [ ] Review timeline and deliverables (as per PDF and institutional requirements)

## 2. Literature Review & Requirement Analysis
- [ ] Research SDN architectures and security vulnerabilities
- [ ] Study AI/ML/DL techniques for anomaly detection and automated response
- [ ] Review self-healing and autonomous network management concepts
- [ ] Analyze existing frameworks for GUI isolation in security systems
- [ ] Identify and summarize key datasets for training and evaluation
- [ ] Document requirements and create system architecture diagrams

## 3. Data Collection & Preprocessing
- [ ] Identify or simulate network traffic datasets (normal and attack scenarios)
- [ ] Implement or source data logging mechanisms for SDN environments
- [ ] Label datasets for supervised/unsupervised learning
- [ ] Preprocess data: cleaning, normalization, feature extraction
- [ ] Split datasets for training, validation, and testing

## 4. AI/ML Model Development
- [ ] Build a Flask microservice for anomaly detection using a pre-trained TensorFlow Autoencoder
- [ ] Define input shape: src_ip, dst_ip, src_port, dst_port, protocol, QoS tag, packet rate, byte count, slice_id (encoded)
- [ ] Implement REST API endpoint (`POST /predict`) for flow anomaly classification
- [ ] Normalize input using sklearn scaler (persisted with model)
- [ ] Log all predictions to MongoDB (`inference_logs`)
- [ ] Test with both normal and attack flow samples (synthetic or pre-generated)
- [ ] Containerize model for deployment (Docker)
- [ ] Document model selection, evaluation, and integration process

## 5. Backend (SDN Integration, APIs & Orchestration)
- [ ] Create FastAPI backend (Python 3.10+)
- [ ] Implement Traffic Monitoring API: parse flow rules from OVS via Ryu, extract flow features, route to AI module, store stats in MongoDB
- [ ] Implement AI Inference Trigger: `/api/analyze` endpoint, send flow data to model, return anomaly_score and decision, trigger self-healing
- [ ] Implement Self-Healing Orchestrator: use Docker SDK to restart containers, update flow rules via Ryu REST API, log actions in MongoDB
- [ ] Implement Real-Time Dashboard APIs: `/api/slice-status`, `/api/traffic-stats`, `/api/anomaly-events`, `/api/container-health`
- [ ] Implement Attack Simulation Endpoint: `/api/simulate-attack?slice=...`
- [ ] Ensure logging and persistence in MongoDB (traffic_logs, anomalies, containers, system_actions)
- [ ] Enable CORS for frontend access
- [ ] Simulate network attacks and normal traffic for end-to-end testing

## 6. Self-Healing Module Development
- [ ] Design self-healing logic for automated recovery from attacks/failures
- [ ] Implement real-time monitoring and predictive analytics
- [ ] Develop automated recovery actions (rerouting, quarantine, restart services)
- [ ] Integrate feedback and continuous learning mechanisms
- [ ] Test self-healing in various failure/attack scenarios

## 7. Frontend (GUI Isolation & Dashboard)
- [ ] Build responsive React.js dashboard (SENTINEL.AI-5G)
- [ ] Implement Slice Health Visualization: status indicators (Green/Red/Yellow), live updates via WebSocket/polling (every 3s), slices: eMBB, URLLC, IoT
- [ ] Implement Anomaly Alert Timeline: chronological list with timestamp, slice, score, action
- [ ] Implement Traffic Statistics: real-time packet rate, bandwidth, anomaly frequency (Chart.js/Recharts)
- [ ] Implement Container Monitoring: Docker status, restart count, recovery status
- [ ] Implement Manual Attack Simulation Panel: button to trigger attack, dropdown for slice selection
- [ ] Use Tailwind CSS for modern, minimal UI
- [ ] Use React Query/Axios for API calls
- [ ] Ensure GUI isolation: sandboxing, CSP, strict input validation
- [ ] Integrate GUI with backend APIs
- [ ] Provide visualization for network state, detected anomalies, and recovery actions
- [ ] Conduct usability and security testing

## 8. System Integration & End-to-End Testing
- [ ] Integrate all modules (AI, SDN, self-healing, GUI)
- [ ] Conduct unit, integration, and system tests
- [ ] Simulate end-to-end attack and recovery scenarios
- [ ] Evaluate system performance, resilience, and accuracy
- [ ] Refine modules based on test results

## 9. Documentation & Reporting
- [ ] Maintain detailed technical documentation for all modules
- [ ] Document test cases, results, and lessons learned
- [ ] Prepare project reports and presentations as per academic guidelines
- [ ] Cite all sources and related work appropriately

## 10. Final Review & Deployment
- [ ] Conduct code review and security audit
- [ ] Prepare deployment scripts and user manuals
- [ ] Deploy system in target/test environment
- [ ] Gather feedback from users/mentors
- [ ] Finalize and submit project deliverables

---

### Research-Backed Best Practices
- Employ real-time monitoring and predictive analytics for proactive defense
- Use centralized SDN control for dynamic network management
- Automate recovery and anomaly response wherever possible
- Ensure continuous learning and feedback in AI models
- Prioritize security and usability in GUI design
- Plan for integration with legacy systems and scalability

---

