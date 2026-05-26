require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Task = require('./models/Task');

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

app.post('/bfhl/tasks', async (req, res) => {
  try {
    const { dueDate } = req.body;
    if (dueDate && new Date(dueDate) <= new Date()) {
      return res.status(400).json({ error: 'dueDate must be a future date' });
    }
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/bfhl/tasks', async (req, res) => {
  try {
    const { status, minImportance } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (minImportance) {
      filter.importance = { $gte: parseInt(minImportance, 10) };
    }

    const tasks = await Task.find(filter);
    const now = new Date();

    const tasksWithPriority = tasks.map((task) => {
      const taskObj = task.toObject();
      let priorityScore = 0;

      if (taskObj.status !== 'completed') {
        const diffTime = new Date(taskObj.dueDate) - now;
        const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const rawScore = (taskObj.importance * 10) + (100 / Math.max(daysUntilDue, 1));
        priorityScore = Math.round(rawScore * 100) / 100;
      }

      return {
        ...taskObj,
        priorityScore
      };
    });

    tasksWithPriority.sort((a, b) => b.priorityScore - a.priorityScore);

    res.status(200).json(tasksWithPriority);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/bfhl/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(200).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/bfhl/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
