const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const NotificationService = {
  // Créer une notification
  createNotification: async (userId, missionId, type, title, message) => {
    try {
      const notificationId = require('crypto').randomUUID();
      await query(
        `INSERT INTO notifications (id, user_id, mission_id, notification_type, title, message) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [notificationId, userId, missionId, type, title, message]
      );
      
      // Récupérer la notification créée
      const result = await query('SELECT * FROM notifications WHERE id = ?', [notificationId]);
      return result.rows[0];
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  },

  // Notifier tous les participants d'une mission
  notifyMissionParticipants: async (missionId, type, title, message) => {
    try {
      // Obtenir tous les participants
      const participants = await query(
        `SELECT DISTINCT mp.external_email, u.email, u.id as user_id
         FROM mission_participants mp
         LEFT JOIN users u ON mp.employee_id = u.id
         WHERE mp.mission_id = ? AND (mp.external_email IS NOT NULL OR u.email IS NOT NULL)`,
        [missionId]
      );

      const notifications = [];
      for (const participant of participants.rows) {
        if (participant.user_id) {
          const notification = await NotificationService.createNotification(
            participant.user_id,
            missionId,
            type,
            title,
            message
          );
          notifications.push(notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Notify participants error:', error);
      throw error;
    }
  },

  // Obtenir les notifications d'un utilisateur
  getUserNotifications: async (userId, limit = 50) => {
    try {
      const result = await query(
        `SELECT n.*, m.mission_reference, m.mission_object
         FROM notifications n
         LEFT JOIN missions_unified m ON n.mission_id = m.id
         WHERE n.user_id = ?
         ORDER BY n.created_at DESC
         LIMIT ?`,
        [userId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Get user notifications error:', error);
      throw error;
    }
  },

  // Marquer une notification comme lue
  markAsRead: async (notificationId, userId) => {
    try {
      await query(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [notificationId, userId]
      );
      
      // Récupérer la notification mise à jour
      const result = await query('SELECT * FROM notifications WHERE id = ?', [notificationId]);
      return result.rows[0];
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw error;
    }
  },

  // Marquer toutes les notifications comme lues
  markAllAsRead: async (userId) => {
    try {
      const result = await query(
        'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
        [userId]
      );
      return result;
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      throw error;
    }
  },

  // Obtenir le nombre de notifications non lues
  getUnreadCount: async (userId) => {
    try {
      const result = await query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        [userId]
      );
      return result.rows[0].count;
    } catch (error) {
      console.error('Get unread count error:', error);
      throw error;
    }
  }
};

module.exports = NotificationService;
