const { Router } = require('express');
const controller = require('../controllers/habitos.controller');

const router = Router();

// Check-in interactivo y rachas
router.get('/hoy', controller.getTodayHabits);
router.get('/rachas', controller.getStreakCalendar);
router.post('/:id/checkin', controller.checkInHabit);
router.delete('/:id/checkin', controller.undoCheckInHabit);

// CRUD de hábitos
router.get('/', controller.getHabits);
router.get('/:id', controller.getHabit);
router.post('/', controller.createHabit);
router.put('/:id', controller.updateHabit);
router.patch('/:id', controller.setHabitActive);

module.exports = router;