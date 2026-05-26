require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Ticket = require('./models/Ticket');
const SLA_MINUTES = require('./models/Ticket').SLA_MINUTES;

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

const STATUS_ORDER = ['open', 'in_progress', 'resolved', 'closed'];

app.post('/tickets', async (req, res) => {
  try {
    const ticket = await Ticket.create(req.body);
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/tickets/stats', async (req, res) => {
  try {
    const byStatus = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byPriority = await Ticket.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const now = new Date();

    const openTickets = await Ticket.find({ status: 'open' });

    let totalBreached = 0;
    for (const ticket of openTickets) {
      const ageMinutes = Math.floor(
        (now - new Date(ticket.createdAt)) / 60000
      );
      if (ageMinutes > SLA_MINUTES[ticket.priority]) {
        totalBreached++;
      }
    }

    res.json({
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      openSlaBreached: totalBreached,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/tickets', async (req, res) => {
  try {
    const { status, priority, breached } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    let tickets = await Ticket.find(filter).sort({ createdAt: -1 });

    const now = Date.now();

    const enriched = tickets.map((ticket) => {
      const obj = ticket.toPublicJSON();
      return obj;
    });

    if (breached === 'true') {
      return res.json(enriched.filter((t) => t.slaBreached));
    }

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { status } = req.body;

    if (!status) {
      const updatedTicket = await Ticket.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      );
      return res.json(updatedTicket);
    }

    const currentIndex = STATUS_ORDER.indexOf(ticket.status);
    const newIndex = STATUS_ORDER.indexOf(status);

    if (newIndex === -1) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const diff = newIndex - currentIndex;

    if (diff !== 1 && diff !== -1) {
      return res.status(400).json({
        error:
          'Invalid transition. Status can only move forward by one step or backward by exactly one step.',
      });
    }

    const updatePayload = { ...req.body, status };

    if (status === 'resolved') {
      updatePayload.resolvedAt = new Date();
    }

    if (diff === -1 && ticket.status === 'resolved') {
      updatePayload.resolvedAt = null;
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    res.json(updatedTicket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`DeskFlow server running on port ${PORT}`));
