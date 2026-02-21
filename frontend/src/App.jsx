import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Thermometer, Droplet, HeartPulse, User } from 'lucide-react';
import './App.css';

// Mock patient list used when API is offline (e.g. Vercel-only deploy)
const MOCK_PATIENTS = [
    { id: 'p1', name: 'John Doe' },
    { id: 'p2', name: 'Jane Smith' },
    { id: 'p3', name: 'Alice Johnson' },
    { id: 'p4', name: 'Bob Brown' }
];

function generateMockData(patientId) {
    const patient = MOCK_PATIENTS.find(p => p.id === patientId) || MOCK_PATIENTS[0];
    return {
        patient_name: patient.name,
        patient_id: patient.id,
        heart_rate: Math.floor(Math.random() * 71) + 60,   // 60-130
        temperature: +(Math.random() * 5.5 + 97).toFixed(1), // 97.0-102.5
        spo2: Math.floor(Math.random() * 16) + 85,          // 85-100
        bp_systolic: Math.floor(Math.random() * 41) + 110,  // 110-150
        bp_diastolic: Math.floor(Math.random() * 26) + 70   // 70-95
    };
}

function App() {
    const [patients, setPatients] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [usingMockData, setUsingMockData] = useState(false);

    const [healthData, setHealthData] = useState({
        patient_name: 'Loading...',
        patient_id: '',
        heart_rate: 0,
        temperature: 0,
        spo2: 0,
        bp_systolic: 0,
        bp_diastolic: 0
    });

    const [historyData, setHistoryData] = useState([]);
    const [error, setError] = useState(null);

    // Detect if running on a remote host (not localhost) — skip backend fetch
    const isRemote = typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';

    // Fetch list of patients on load (fallback to mock list)
    useEffect(() => {
        if (isRemote) {
            // On Vercel / remote: use mock data immediately
            setUsingMockData(true);
            setPatients(MOCK_PATIENTS);
            setSelectedPatientId(MOCK_PATIENTS[0].id);
            return;
        }
        const fetchPatients = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                const response = await fetch(`${apiUrl}/patients`, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) {
                    const data = await response.json();
                    setPatients(data);
                    if (data.length > 0) setSelectedPatientId(data[0].id);
                    return;
                }
            } catch (err) {
                console.warn('API unavailable, using demo mode', err);
            }
            // Fallback: use mock patients
            setUsingMockData(true);
            setPatients(MOCK_PATIENTS);
            setSelectedPatientId(MOCK_PATIENTS[0].id);
        };
        fetchPatients();
    }, []);

    // Poll health data (fallback to mock generator)
    useEffect(() => {
        if (!selectedPatientId) return;

        const fetchHealthData = async () => {
            let data;
            if (!usingMockData) {
                try {
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    const response = await fetch(`${apiUrl}/health?patient_id=${selectedPatientId}`);
                    if (!response.ok) throw new Error('Network response was not ok');
                    data = await response.json();
                    setError(null);
                } catch (err) {
                    console.warn('API fetch failed, switching to demo mode');
                    setUsingMockData(true);
                    data = generateMockData(selectedPatientId);
                }
            } else {
                data = generateMockData(selectedPatientId);
            }

            setHealthData(data);

            // Update History (keep last 20 readings)
            setHistoryData(prev => {
                const now = new Date();
                const timeString = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                const newPoint = {
                    time: timeString,
                    hr: data.heart_rate,
                    temp: data.temperature
                };
                const newHistory = [...prev, newPoint];
                if (newHistory.length > 20) return newHistory.slice(newHistory.length - 20);
                return newHistory;
            });
        };

        fetchHealthData();
        const interval = setInterval(fetchHealthData, 3000);
        return () => clearInterval(interval);
    }, [selectedPatientId, usingMockData]);

    // Handle patient change
    const handlePatientSelect = (e) => {
        setSelectedPatientId(e.target.value);
        setHistoryData([]); // Clear history chart when switching patients
    };

    const isHrAlert = healthData.heart_rate > 120;
    const isSpo2Warning = healthData.spo2 < 90;
    const isBpAlert = healthData.bp_systolic > 130 || healthData.bp_diastolic > 80;

    let overallStatus = "Healthy";
    let statusClass = "status-healthy";

    if (isHrAlert || isBpAlert) {
        overallStatus = "Critical";
        statusClass = "status-critical";
    } else if (isSpo2Warning) {
        overallStatus = "Warning";
        statusClass = "status-warning";
    }

    return (
        <div className="layout">
            {/* Sidebar for Patient Selection */}
            <aside className="sidebar">
                <div className="brand">
                    <Activity className="icon-pulse" />
                    <h2>HealthDash</h2>
                </div>

                <div className="patient-selector">
                    <label><User size={16} /> Select Patient</label>
                    <select value={selectedPatientId} onChange={handlePatientSelect}>
                        {patients.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className={`overall-status ${statusClass}`}>
                    <h4>Overall Status</h4>
                    <p>{overallStatus}</p>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="dashboard-container">
                <header className="dashboard-header">
                    <div>
                        <h1>Monitoring: {healthData.patient_name}</h1>
                        <p className="subtitle">Real-time vital signs and historical trend tracking</p>
                    </div>
                    <div className="status-indicator">
                        {error ? <span className="error-text">🔴 Offline</span> : usingMockData ? <span className="success-text">🟡 Demo Mode</span> : <span className="success-text">🟢 Live Updates</span>}
                    </div>
                </header>

                {error && <div className="error-banner">{error}</div>}

                <div className="cards-grid">
                    <div className={`card ${isHrAlert ? 'alert' : 'normal'}`}>
                        <div className="card-header">
                            <h3>Heart Rate</h3>
                            <Activity className={isHrAlert ? "icon-danger" : "icon-accent"} />
                        </div>
                        <div className="value">{healthData.heart_rate} <span className="unit">bpm</span></div>
                        {isHrAlert && <div className="alert-message">⚠️ High Heart Rate Alert!</div>}
                    </div>

                    <div className={`card ${isBpAlert ? 'alert' : 'normal'}`}>
                        <div className="card-header">
                            <h3>Blood Pressure</h3>
                            <HeartPulse className={isBpAlert ? "icon-danger" : "icon-accent"} />
                        </div>
                        <div className="value">{healthData.bp_systolic}/{healthData.bp_diastolic} <span className="unit">mmHg</span></div>
                        {isBpAlert && <div className="alert-message">⚠️ High BP Detected!</div>}
                    </div>

                    <div className="card normal">
                        <div className="card-header">
                            <h3>Temperature</h3>
                            <Thermometer className="icon-accent" />
                        </div>
                        <div className="value">{healthData.temperature} <span className="unit">°F</span></div>
                    </div>

                    <div className={`card ${isSpo2Warning ? 'warning' : 'normal'}`}>
                        <div className="card-header">
                            <h3>SpO2 (Oxygen)</h3>
                            <Droplet className={isSpo2Warning ? "icon-warning" : "icon-accent"} />
                        </div>
                        <div className="value">{healthData.spo2} <span className="unit">%</span></div>
                        {isSpo2Warning && <div className="warning-message">⚠️ Low SpO2 Warning</div>}
                    </div>
                </div>

                {/* Charts Section */}
                <div className="charts-container">
                    <div className="chart-wrapper">
                        <h3>Heart Rate Trend (bpm)</h3>
                        <div className="chart-box">
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={historyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                                    <YAxis domain={['auto', 'auto']} stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                    <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={3} isAnimationActive={false} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="chart-wrapper">
                        <h3>Temperature Trend (°F)</h3>
                        <div className="chart-box">
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={historyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                                    <YAxis domain={['auto', 'auto']} stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                    <Line type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={3} isAnimationActive={false} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}

export default App;
