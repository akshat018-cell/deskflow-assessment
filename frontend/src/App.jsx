import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://localhost:5000/bfhl/tasks';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [minImportance, setMinImportance] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    importance: 3,
    dueDate: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const loadData = async () => {
      try {
        const params = {};
        if (statusFilter !== 'All') {
          params.status = statusFilter.toLowerCase();
        }
        if (minImportance > 1) {
          params.minImportance = minImportance;
        }
        const response = await axios.get(API_BASE, { params });
        if (!isCancelled) {
          setTasks(response.data);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Failed to fetch tasks');
          setLoading(false);
        }
      }
    };
    loadData();
    return () => {
      isCancelled = true;
    };
  }, [statusFilter, minImportance]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'importance' ? Number(value) : value
    }));
  };

  const validateForm = () => {
    const { title, dueDate } = formData;
    if (title.length < 3 || title.length > 100) return false;
    if (dueDate && new Date(dueDate) <= new Date()) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('Invalid input. Title must be 3-100 characters and due date must be in the future.');
      return;
    }
    setFormLoading(true);
    try {
      const response = await axios.post(API_BASE, formData);
      setTasks((prev) => [...prev, response.data].sort((a, b) => b.priorityScore - a.priorityScore));
      setFormData({ title: '', description: '', importance: 3, dueDate: '' });
    } catch (err) {
      alert(err.message || 'Failed to create task');
    } finally {
      setFormLoading(false);
    }
  };

  const markAsComplete = async (id) => {
    try {
      const response = await axios.patch(`${API_BASE}/${id}`, { status: 'completed' });
      setTasks((prev) =>
        prev.map((t) => (t._id === id || t.id === id ? response.data : t)).sort((a, b) => b.priorityScore - a.priorityScore)
      );
    } catch (err) {
      alert(err.message || 'Failed to update task');
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`${API_BASE}/${id}`);
      setTasks((prev) => prev.filter((t) => t._id !== id && t.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>TaskFlow</h1>
      </header>

      <section className="filters-section">
        <select value={statusFilter} onChange={(e) => {
          setLoading(true);
          setError(null);
          setStatusFilter(e.target.value);
        }}>
          <option value="All">All</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
        </select>
        <div className="slider-container">
          <label>Min Importance: {minImportance}</label>
          <input
            type="range"
            min="1"
            max="5"
            value={minImportance}
            onChange={(e) => {
              setLoading(true);
              setError(null);
              setMinImportance(Number(e.target.value));
            }}
          />
        </div>
      </section>

      <section className="create-task-section">
        <h2>Create Task</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="title"
            placeholder="Title (3-100 chars)"
            value={formData.title}
            onChange={handleInputChange}
            required
          />
          <textarea
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleInputChange}
          ></textarea>
          <div className="form-group">
            <label>Importance (1-5)</label>
            <input
              type="number"
              name="importance"
              min="1"
              max="5"
              value={formData.importance}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="datetime-local"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit" disabled={formLoading || !validateForm()}>
            {formLoading ? 'Creating...' : 'Submit'}
          </button>
        </form>
      </section>

      <main className="task-grid-section">
        {error && <div className="error-message">{error}</div>}
        {loading ? (
          <div className="loading-indicator">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">No tasks found</div>
        ) : (
          <div className="task-grid">
            {tasks.map((task) => {
              const taskId = task._id || task.id;
              const isHighPriority = task.priorityScore >= 50;
              return (
                <div
                  key={taskId}
                  className="task-card"
                  style={isHighPriority ? { border: '2px solid red' } : {}}
                >
                  {isHighPriority && <span className="high-priority-badge">High Priority</span>}
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                  <div className="task-meta">
                    <span>Importance: {task.importance}</span>
                    <span>Status: {task.status}</span>
                    <span>Score: {task.priorityScore}</span>
                  </div>
                  <div className="task-date">
                    Due: {new Date(task.dueDate).toLocaleString()}
                  </div>
                  <div className="task-actions">
                    {task.status !== 'completed' && (
                      <button onClick={() => markAsComplete(taskId)}>Mark as Complete</button>
                    )}
                    <button className="delete-btn" onClick={() => deleteTask(taskId)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
