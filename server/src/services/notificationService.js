const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Create an in-app notification
   */
  static async send({ recipient = null, targetRole = null, title, message, type = 'System', link = '', metadata = {} }) {
    try {
      const notification = await Notification.create({
        recipient,
        targetRole,
        title,
        message,
        type,
        link,
        metadata
      });
      return notification;
    } catch (err) {
      console.error('[NotificationService Error]:', err.message);
      // Notification failure must not break main transaction
      return null;
    }
  }

  /**
   * Get notifications for a user (direct notifications or targeted by role)
   */
  static async getForUser(userId, role, limit = 50) {
    const query = {
      $or: [
        { recipient: userId },
        { targetRole: role },
        { targetRole: 'All' }
      ]
    };

    return await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Mark notification as read
   */
  static async markRead(notificationId, userId) {
    const notification = await Notification.findById(notificationId);
    if (!notification) return null;

    if (notification.recipient && notification.recipient.toString() === userId.toString()) {
      notification.isRead = true;
    }

    const alreadyRead = notification.readBy.some(r => r.user.toString() === userId.toString());
    if (!alreadyRead) {
      notification.readBy.push({ user: userId, readAt: new Date() });
    }

    await notification.save();
    return notification;
  }
}

module.exports = NotificationService;
