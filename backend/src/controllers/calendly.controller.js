import crypto from 'crypto';
import Visit from '../models/Visit.js';
import Property from '../models/Property.js';
import OfficeLocation from '../models/OfficeLocation.js';
import User from '../models/User.js';
import { ApiError } from '../middlewares/error.middleware.js';

/**
 * @desc    Handle Calendly webhook for new bookings
 * @route   POST /api/calendly/webhook
 * @access  Public (verified via signature)
 */
export const handleCalendlyWebhook = async (req, res, next) => {
  try {
    // Verify webhook signature (if CALENDLY_WEBHOOK_SIGNING_KEY is set)
    const signature = req.headers['calendly-webhook-signature'];

    if (process.env.CALENDLY_WEBHOOK_SIGNING_KEY) {
      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', process.env.CALENDLY_WEBHOOK_SIGNING_KEY)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid Calendly webhook signature');
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }
    }

    const { event, payload } = req.body;

    // Handle different event types
    switch (event) {
      case 'invitee.created':
      case 'calendly.event.created':
        await handleBookingCreated(payload);
        break;

      case 'invitee.canceled':
      case 'calendly.event.canceled':
        await handleBookingCanceled(payload);
        break;

      default:
        console.log(`Unhandled Calendly event: ${event}`);
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Calendly webhook error:', error);
    next(error);
  }
};

/**
 * Handle new Calendly booking
 */
async function handleBookingCreated(payload) {
  try {
    // Extract booking details from Calendly payload
    const eventDetails = payload.event || payload;
    const inviteeDetails = payload.invitee || payload.questions_and_answers || {};

    // Parse scheduled time
    const scheduledDate = new Date(eventDetails.start_time || eventDetails.start_time_pretty);
    const scheduledTime = scheduledDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Extract tracking info that we need
    // These would be set up as Calendly tracking parameters or custom questions
    const trackingInfo = parseCalendlyTracking(payload);

    // Find the partner by email
    const partnerEmail = inviteeDetails.email || trackingInfo.partnerEmail;
    const partner = await User.findOne({ email: partnerEmail, role: 'partner' });

    if (!partner) {
      console.error(`Partner not found for email: ${partnerEmail}`);
      return;
    }

    // Find the office by Calendly URL
    const calendlyUrl = eventDetails.calendar_url || trackingInfo.calendlyUrl;
    const office = await OfficeLocation.findOne({ calendlyUrl: { $regex: new RegExp(calendlyUrl?.split('?')[0] || '', 'i') } });

    // Find property if specified
    let property = null;
    if (trackingInfo.propertyId) {
      property = await Property.findById(trackingInfo.propertyId);
    }

    // Create or update visit
    const visitData = {
      partnerId: partner._id,
      companyId: partner.companyId || trackingInfo.companyId,
      propertyId: property?._id || null,
      visitType: trackingInfo.visitType || 'office',
      scheduledDate,
      scheduledTime,
      clientDetails: {
        name: `${inviteeDetails.first_name || ''} ${inviteeDetails.last_name || ''}`.trim() || inviteeDetails.name || partner.firstName,
        phone: trackingInfo.clientPhone || partner.phone || '',
        email: partnerEmail,
        alternatePhone: trackingInfo.alternatePhone || ''
      },
      officeLocation: office ? {
        _id: office._id,
        name: office.name,
        address: office.address,
        phone: office.phone,
        email: office.email
      } : null,
      status: 'approved', // Auto-approve Calendly bookings
      calendlyEventId: eventDetails.uuid || eventDetails.id || trackingInfo.eventId,
      calendlyEventUrl: eventDetails.uri || '',
      partnerNotes: trackingInfo.notes || inviteeDetails.notes || ''
    };

    // Check if visit already exists (prevent duplicates)
    const existingVisit = await Visit.findOne({
      partnerId: partner._id,
      calendlyEventId: visitData.calendlyEventId
    });

    if (existingVisit) {
      console.log(`Visit already exists for Calendly event: ${visitData.calendlyEventId}`);
      return;
    }

    const visit = await Visit.create(visitData);
    console.log(`Created visit from Calendly booking: ${visit._id}`);

  } catch (error) {
    console.error('Error handling Calendly booking:', error);
    throw error;
  }
}

/**
 * Handle Calendly booking cancellation
 */
async function handleBookingCanceled(payload) {
  try {
    const eventDetails = payload.event || payload;
    const eventId = eventDetails.uuid || eventDetails.id;

    const visit = await Visit.findOne({ calendlyEventId: eventId });

    if (visit) {
      visit.status = 'cancelled';
      visit.cancellationReason = 'Canceled via Calendly';
      await visit.save();
      console.log(`Cancelled visit from Calendly: ${visit._id}`);
    }
  } catch (error) {
    console.error('Error handling Calendly cancellation:', error);
    throw error;
  }
}

/**
 * Parse tracking parameters from Calendly payload
 */
function parseCalendlyTracking(payload) {
  const tracking = {};

  // Calendly allows tracking parameters in the URL
  // e.g., calendly.com/company/office?propertyId=xxx&partnerId=xxx

  try {
    const event = payload.event || payload;
    const invitee = payload.invitee || {};

    // Extract from tracking parameters
    if (event.calendar_url) {
      const url = new URL(event.calendar_url);
      const params = new URLSearchParams(url.search);

      tracking.propertyId = params.get('propertyId');
      tracking.partnerId = params.get('partnerId');
      tracking.companyId = params.get('companyId');
      tracking.visitType = params.get('visitType');
      tracking.clientPhone = params.get('clientPhone');
      tracking.calendlyUrl = event.calendar_url;
    }

    // Extract from custom questions if configured
    if (payload.questions_and_answers) {
      for (const qa of payload.questions_and_answers) {
        if (qa.question?.toLowerCase().includes('property')) {
          tracking.propertyId = qa.answer;
        }
        if (qa.question?.toLowerCase().includes('visit type')) {
          tracking.visitType = qa.answer?.toLowerCase();
        }
        if (qa.question?.toLowerCase().includes('phone')) {
          tracking.clientPhone = qa.answer;
        }
      }
    }

    // Get from cancel_url or thank you page URL
    if (event.cancel_url) {
      const cancelUrl = new URL(event.cancel_url);
      const params = new URLSearchParams(cancelUrl.search);

      if (!tracking.propertyId) tracking.propertyId = params.get('propertyId');
      if (!tracking.companyId) tracking.companyId = params.get('companyId');
    }

    tracking.eventId = event.uuid || event.id;
    tracking.partnerEmail = invitee.email;
    tracking.notes = invitee.notes || payload.notes || '';

  } catch (e) {
    console.log('Could not parse Calendly tracking params:', e.message);
  }

  return tracking;
}

/**
 * @desc    Get Calendly embed URL for an office
 * @route   GET /api/offices/:id/calendly-url
 * @access  Private
 */
export const getCalendlyUrl = async (req, res, next) => {
  try {
    const { id } = req.params;

    const office = await OfficeLocation.findOne({
      _id: id,
      companyId: req.user.companyId
    });

    if (!office) {
      throw new ApiError(404, 'Office not found');
    }

    // If office has a Calendly URL, return it
    if (office.calendlyUrl) {
      return res.status(200).json({
        success: true,
        data: {
          calendlyUrl: office.calendlyUrl,
          officeName: office.name,
          officeAddress: office.address
        }
      });
    }

    // Otherwise return empty
    res.status(200).json({
      success: true,
      data: {
        calendlyUrl: null,
        officeName: office.name,
        officeAddress: office.address,
        message: 'No Calendly URL configured for this office'
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @desc    Generate Calendly URL with tracking parameters
 * @route   POST /api/calendly/generate-url
 * @access  Private (partner)
 */
export const generateCalendlyUrlWithTracking = async (req, res, next) => {
  try {
    const { officeId, propertyId, visitType } = req.body;

    // Get office
    const office = await OfficeLocation.findById(officeId);
    if (!office || !office.calendlyUrl) {
      throw new ApiError(400, 'This office does not have Calendly scheduling configured');
    }

    // Get partner's company info
    const PartnerCompany = (await import('../models/PartnerCompany.js')).default;
    const partnership = await PartnerCompany.findOne({
      partnerId: req.user._id,
      status: 'active'
    }).populate('companyId');

    if (!partnership) {
      throw new ApiError(400, 'No active partnership found');
    }

    // Build Calendly URL with tracking parameters
    let calendlyUrl = office.calendlyUrl;

    // Add tracking parameters
    const params = new URLSearchParams();
    params.append('partnerId', req.user._id.toString());
    params.append('companyId', partnership.companyId._id.toString());
    if (propertyId) params.append('propertyId', propertyId);
    if (visitType) params.append('visitType', visitType);

    // Append to URL
    const separator = calendlyUrl.includes('?') ? '&' : '?';
    calendlyUrl = `${calendlyUrl}${separator}${params.toString()}`;

    res.status(200).json({
      success: true,
      data: {
        calendlyUrl,
        officeName: office.name,
        officeAddress: office.address
      }
    });
  } catch (error) {
    next(error);
  }
}

export default {
  handleCalendlyWebhook,
  getCalendlyUrl,
  generateCalendlyUrlWithTracking
};