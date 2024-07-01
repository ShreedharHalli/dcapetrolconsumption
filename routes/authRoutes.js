const { Router } = require('express');
const authController = require('../controllers/authController');
const router = Router();

router.post('/login', authController.login_post);
router.post('/signup', authController.signup_post);
router.get('/login', authController.login_get);
router.get('/confirmworking', authController.confirmworking_get)
router.get('/approver', authController.approver_get);
router.get('/logout', authController.logout_get);
router.get('/images/:id/:field', authController.serveImage_get);
router.post('/createcommute', authController.createcommute_post);
router.post('/approvecommute', authController.approvecommute_post);




module.exports = router;