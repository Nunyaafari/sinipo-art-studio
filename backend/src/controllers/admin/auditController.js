import { getAdminAuditEntries, getAdminAuditStats } from '../../utils/adminAudit.js';

export const getAuditLogs = async (req, res) => {
  try {
    const { action, targetType, search, limit } = req.query;
    const logs = getAdminAuditEntries({
      action,
      targetType,
      search,
      limit
    });

    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      error: 'Failed to get audit logs',
      message: error.message
    });
  }
};

export const getAuditStats = async (req, res) => {
  try {
    res.json({
      success: true,
      data: getAdminAuditStats()
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({
      error: 'Failed to get audit stats',
      message: error.message
    });
  }
};
