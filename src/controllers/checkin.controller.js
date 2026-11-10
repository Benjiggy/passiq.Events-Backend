const { z } = require('zod');
const dataStore = require('../models/dataStore');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const Ticket = require('../models/Ticket');
const Scan = require('../models/Scan');

// Mask email for privacy in server logs
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return 'anonymous';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
};

// Clean and extract code from raw scan string (handles keyboard scanners, URLs, query params)
const extractTicketCode = (raw) => {
  let clean = String(raw || '').trim();
  if (clean.includes('ticket=')) {
    const match = clean.match(/[?&]ticket=([A-Za-z0-9_-]+)/i);
    if (match) clean = match[1];
  } else if (clean.includes('code=')) {
    const match = clean.match(/[?&]code=([A-Za-z0-9_-]+)/i);
    if (match) clean = match[1];
  } else if (clean.includes('/tickets/')) {
    const after = clean.split('/tickets/')[1];
    if (after) clean = after.split(/[?#&/]/)[0];
  } else if (clean.startsWith('PASSIQ-LIVE:') || clean.startsWith('PASSIQ-DEMO:')) {
    const parts = clean.split(':');
    clean = parts[1] || parts[0];
  }
  return clean.trim().toUpperCase();
};

const scanInputSchema = z.object({
  code: z.string().min(1, 'Ticket code is required'),
  eventId: z.string().optional().nullable(),
  scannerLabel: z.string().optional().default('Main Scanner')
});

class CheckinController {
  /**
   * Scan a ticket code atomically
   * POST /api/checkin/scan
   */
  static async scanTicket(req, res) {
    try {
      const parsed = scanInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return ApiResponse.error(res, parsed.error.errors[0]?.message || 'Invalid input data', 400);
      }

      const { code, eventId, scannerLabel } = parsed.data;
      const cleanCode = extractTicketCode(code);
      const operator = req.user?.name || req.user?.email || 'Staff';
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

      const outcome = await dataStore.atomicScanTicket({
        code: cleanCode,
        eventId,
        operator,
        scannerLabel: scannerLabel || 'Main Scanner',
        ip
      });

      const masked = maskEmail(outcome.attendeeEmail);
      logger.info(`[Checkin Scan] Code: ${cleanCode} -> Result: ${outcome.result.toUpperCase()} (Attendee: ${masked})`);

      if (outcome.result === 'success') {
        return res.status(200).json({
          success: true,
          result: 'success',
          status: 'valid',
          message: 'Valid ticket pass.',
          data: {
            name: outcome.attendeeName,
            email: outcome.attendeeEmail,
            ticketType: outcome.ticketType,
            event: outcome.eventTitle,
            scannedAt: outcome.scannedAt,
            ticketId: outcome.ticketId
          }
        });
      }

      if (outcome.result === 'duplicate') {
        return res.status(200).json({
          success: false,
          result: 'duplicate',
          status: 'used',
          message: 'Ticket already used.',
          data: {
            name: outcome.attendeeName,
            email: outcome.attendeeEmail,
            ticketType: outcome.ticketType,
            event: outcome.eventTitle,
            usedAt: outcome.usedAt
          }
        });
      }

      if (outcome.result === 'void') {
        return res.status(200).json({
          success: false,
          result: 'void',
          status: 'void',
          message: outcome.message || 'Ticket has been voided.',
          data: {
            name: outcome.attendeeName,
            email: outcome.attendeeEmail,
            ticketType: outcome.ticketType
          }
        });
      }

      // Invalid
      return res.status(200).json({
        success: false,
        result: 'invalid',
        status: 'invalid',
        message: outcome.message || 'Invalid ticket pass.'
      });
    } catch (error) {
      logger.error('[Checkin Scan Error]', error);
      return ApiResponse.error(res, 'Internal server error while processing scan: ' + error.message, 500);
    }
  }

  /**
   * Get last 10-50 scans for the event
   * GET /api/checkin/recent?eventId=
   */
  static async getRecentScans(req, res) {
    try {
      const { eventId, limit } = req.query;
      const scans = await dataStore.listRecentScans(eventId, limit || 10);
      return res.status(200).json({
        success: true,
        data: scans
      });
    } catch (error) {
      logger.error('[Checkin Recent Error]', error);
      return ApiResponse.error(res, 'Failed to fetch recent scans: ' + error.message, 500);
    }
  }

  /**
   * Get checkin stats for an event (scanned, total, remaining)
   * GET /api/checkin/stats?eventId=
   */
  static async getStats(req, res) {
    try {
      const { eventId } = req.query;
      const stats = await dataStore.getCheckinStats(eventId);
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('[Checkin Stats Error]', error);
      return ApiResponse.error(res, 'Failed to fetch checkin stats: ' + error.message, 500);
    }
  }

  /**
   * Admin Table of all scans
   * GET /api/admin/checkins
   */
  static async listAdminScans(req, res) {
    try {
      const { eventId, result, search, page, limit } = req.query;
      const response = await dataStore.listAllScans({
        eventId,
        result,
        search,
        page,
        limit
      });
      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error('[Admin Checkins List Error]', error);
      return ApiResponse.error(res, 'Failed to fetch checkin logs: ' + error.message, 500);
    }
  }

  /**
   * Export Scans to CSV
   * GET /api/admin/checkins/export
   */
  static async exportScansCsv(req, res) {
    try {
      const { eventId, result } = req.query;
      const response = await dataStore.listAllScans({
        eventId,
        result,
        page: 1,
        limit: 10000
      });

      const header = ['Scan Time', 'Result', 'Ticket Code', 'Attendee Name', 'Attendee Email', 'Ticket Type', 'Event', 'Scanner / Operator', 'IP'];
      const rows = (response.scans || []).map(s => {
        const time = s.scannedAt ? new Date(s.scannedAt).toISOString() : '';
        const resCol = (s.result || '').toUpperCase();
        const code = `"${(s.code || '').replace(/"/g, '""')}"`;
        const name = `"${(s.holderName || '').replace(/"/g, '""')}"`;
        const email = `"${(s.holderEmail || '').replace(/"/g, '""')}"`;
        const type = `"${(s.ticketType || '').replace(/"/g, '""')}"`;
        const event = `"${(s.eventTitle || '').replace(/"/g, '""')}"`;
        const op = `"${(s.operator || '').replace(/"/g, '""')}"`;
        const ip = `"${(s.ip || '').replace(/"/g, '""')}"`;
        return [time, resCol, code, name, email, type, event, op, ip].join(',');
      });

      const csvContent = [header.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=passiq-checkin-scans-${Date.now()}.csv`);
      return res.status(200).send(csvContent);
    } catch (error) {
      logger.error('[Admin Checkins CSV Export Error]', error);
      return ApiResponse.error(res, 'Failed to export scans CSV: ' + error.message, 500);
    }
  }

  /**
   * Admin Manual Reset or Void of a Ticket
   * POST /api/admin/checkins/ticket-status
   */
  static async updateTicketStatus(req, res) {
    try {
      const { ticketId, code, status, reason } = req.body;
      if (!['valid', 'void', 'used'].includes(status)) {
        return ApiResponse.error(res, "Status must be 'valid', 'void', or 'used'", 400);
      }

      const cleanCode = code ? extractTicketCode(code) : null;
      let ticket = null;

      if (ticketId) {
        ticket = await dataStore.getTicketByCodeOrId(ticketId);
      } else if (cleanCode) {
        ticket = await dataStore.getTicketByCodeOrId(cleanCode);
      }

      if (!ticket) {
        return ApiResponse.error(res, 'Ticket not found.', 404);
      }

      const previousStatus = ticket.status;
      const updateData = { status };

      if (status === 'valid') {
        updateData.usedAt = null;
        updateData.checkedInAt = null;
        updateData.usedBy = null;
        updateData.checkedInBy = null;
      } else if (status === 'used') {
        updateData.usedAt = new Date();
        updateData.checkedInAt = updateData.usedAt;
        updateData.usedBy = req.user?.name || 'Admin';
        updateData.checkedInBy = updateData.usedBy;
      }

      const updated = await dataStore.updateTicket(ticket.id || ticket._id, updateData);

      // Record audit log as a Scan entry
      const auditLog = {
        ticketId: ticket.id || ticket._id,
        code: ticket.code || ticket.ticketCode,
        eventId: ticket.eventId?._id || ticket.eventId,
        result: status === 'valid' ? 'success' : (status === 'void' ? 'void' : 'duplicate'),
        scannedAt: new Date(),
        operator: `Admin (${req.user?.name || req.user?.email || 'admin'})`,
        scannerLabel: 'Admin Override',
        ip: req.ip || '',
        holderName: ticket.holderName || ticket.userName,
        holderEmail: ticket.holderEmail || ticket.userEmail,
        ticketType: ticket.ticketType || ticket.tierName,
        metadata: {
          action: 'status_override',
          previousStatus,
          newStatus: status,
          reason: reason || 'Manual admin override'
        }
      };

      if (typeof Scan !== 'undefined' && Scan.create) {
        try {
          await Scan.create(auditLog);
        } catch (e) {
          // ignore scan log error
        }
      }

      return res.status(200).json({
        success: true,
        message: `Ticket status successfully changed from ${previousStatus} to ${status}.`,
        data: updated || ticket
      });
    } catch (error) {
      logger.error('[Admin Ticket Status Override Error]', error);
      return ApiResponse.error(res, 'Failed to update ticket status: ' + error.message, 500);
    }
  }
}

module.exports = CheckinController;
