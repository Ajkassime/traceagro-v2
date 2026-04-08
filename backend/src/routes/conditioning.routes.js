
const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const ctrl = require('../controllers/conditioning.controller')

router.use(authenticate)

router.get('/norms',                              ctrl.getNorms)
router.get('/steps-templates',                    ctrl.getStepTemplates)
router.get('/',                                   ctrl.getOrders)
router.get('/:id',                                ctrl.getOrder)
router.post('/',                                  ctrl.createOrder)
router.put('/:id/steps/:stepId',                  ctrl.updateStep)
router.post('/:id/steps/:stepId/validate',        ctrl.validateStep)

module.exports = router
