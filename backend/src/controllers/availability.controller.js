import OfficeLocation from '../models/OfficeLocation.js';
import OfficeAvailability from '../models/OfficeAvailability.js';
import Visit from '../models/Visit.js';
import { ApiError } from '../middlewares/error.middleware.js';

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// ==================== AVAILABILITY MANAGEMENT ====================

/**
 * @desc    Get availability for an office
 * @route   GET /api/offices/:officeId/availability
 * @access  Private (company_superadmin, partner_manager)
 */
export const getAvailability = async (req, res, next) => {
  try {
    const { officeId } = req.params;

    // Verify office belongs to company
    const office = await OfficeLocation.findOne({
      _id: officeId,
      companyId: req.user.companyId
    });

    if (!office) {
      throw new ApiError(404, 'Office not found');
    }

    let availability = await OfficeAvailability.findOne({
      companyId: req.user.companyId,
      officeId
    });

    // If no availability exists, return default
    if (!availability) {
      availability = {
        officeId,
        workingHours: {
          monday: { start: '09:00', end: '18:00', isActive: true },
          tuesday: { start: '09:00', end: '18:00', isActive: true },
          wednesday: { start: '09:00', end: '18:00', isActive: true },
          thursday: { start: '09:00', end: '18:00', isActive: true },
          friday: { start: '09:00', end: '18:00', isActive: true },
          saturday: { start: '09:00', end: '14:00', isActive: false },
          sunday: { start: '09:00', end: '14:00', isActive: false }
        },
        slotDuration: 30,
        bufferTime: 0,
        maxVisitsPerSlot: 3,
        blockedDates: [],
        isActive: true
      };
    }

    res.status(200).json({
      success: true,
      data: { availability, office }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create or update availability for an office
 * @route   PUT /api/offices/:officeId/availability
 * @access  Private (company_superadmin, partner_manager)
 */
export const updateAvailability = async (req, res, next) => {
  try {
    const { officeId } = req.params;
    const { workingHours, slotDuration, bufferTime, maxVisitsPerSlot, blockedDates, isActive } = req.body;

    // Verify office belongs to company
    const office = await OfficeLocation.findOne({
      _id: officeId,
      companyId: req.user.companyId
    });

    if (!office) {
      throw new ApiError(404, 'Office not found');
    }

    let availability = await OfficeAvailability.findOne({
      companyId: req.user.companyId,
      officeId
    });

    if (availability) {
      // Update existing
      if (workingHours) availability.workingHours = workingHours;
      if (slotDuration !== undefined) availability.slotDuration = slotDuration;
      if (bufferTime !== undefined) availability.bufferTime = bufferTime;
      if (maxVisitsPerSlot !== undefined) availability.maxVisitsPerSlot = maxVisitsPerSlot;
      if (blockedDates !== undefined) availability.blockedDates = blockedDates;
      if (isActive !== undefined) availability.isActive = isActive;

      await availability.save();
    } else {
      // Create new
      availability = await OfficeAvailability.create({
        companyId: req.user.companyId,
        officeId,
        workingHours: workingHours || {
          monday: { start: '09:00', end: '18:00', isActive: true },
          tuesday: { start: '09:00', end: '18:00', isActive: true },
          wednesday: { start: '09:00', end: '18:00', isActive: true },
          thursday: { start: '09:00', end: '18:00', isActive: true },
          friday: { start: '09:00', end: '18:00', isActive: true },
          saturday: { start: '09:00', end: '14:00', isActive: false },
          sunday: { start: '09:00', end: '14:00', isActive: false }
        },
        slotDuration: slotDuration || 30,
        bufferTime: bufferTime || 0,
        maxVisitsPerSlot: maxVisitsPerSlot || 3,
        blockedDates: blockedDates || [],
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: { availability }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add blocked date
 * @route   POST /api/offices/:officeId/availability/blocked-dates
 * @access  Private (company_superadmin, partner_manager)
 */
export const addBlockedDate = async (req, res, next) => {
  try {
    const { officeId } = req.params;
    const { date, reason } = req.body;

    const availability = await OfficeAvailability.findOne({
      companyId: req.user.companyId,
      officeId
    });

    if (!availability) {
      throw new ApiError(404, 'Availability not found. Please set up availability first.');
    }

    availability.blockedDates.push({ date: new Date(date), reason });
    await availability.save();

    res.status(200).json({
      success: true,
      message: 'Blocked date added successfully',
      data: { blockedDates: availability.blockedDates }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove blocked date
 * @route   DELETE /api/offices/:officeId/availability/blocked-dates/:dateId
 * @access  Private (company_superadmin, partner_manager)
 */
export const removeBlockedDate = async (req, res, next) => {
  try {
    const { officeId, dateId } = req.params;

    const availability = await OfficeAvailability.findOne({
      companyId: req.user.companyId,
      officeId
    });

    if (!availability) {
      throw new ApiError(404, 'Availability not found');
    }

    availability.blockedDates = availability.blockedDates.filter(
      d => d._id.toString() !== dateId
    );
    await availability.save();

    res.status(200).json({
      success: true,
      message: 'Blocked date removed successfully',
      data: { blockedDates: availability.blockedDates }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== AVAILABLE SLOTS CALCULATION ====================

/**
 * @desc    Get available time slots for a date range
 * @route   GET /api/offices/:officeId/available-slots
 * @access  Private (partner, company_superadmin, partner_manager)
 */
export const getAvailableSlotsForOffice = async (req, res, next) => {
  try {
    const { officeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ApiError(400, 'Start date and end date are required');
    }

    // Get office
    const office = await OfficeLocation.findById(officeId);
    if (!office) {
      throw new ApiError(404, 'Office not found');
    }

    // Check access - partner should have active partnership with the company
    if (req.user.role === 'partner') {
      const PartnerCompany = (await import('../models/PartnerCompany.js')).default;
      const partnership = await PartnerCompany.findOne({
        partnerId: req.user._id,
        companyId: office.companyId,
        status: 'active'
      });
      if (!partnership) {
        throw new ApiError(403, 'You do not have access to this office');
      }
    } else {
      // Admin/manager should belong to the company
      if (req.user.companyId.toString() !== office.companyId.toString()) {
        throw new ApiError(403, 'You do not have access to this office');
      }
    }

    // Get availability settings
    let availability = await OfficeAvailability.findOne({ officeId });

    // If no custom availability, use defaults
    if (!availability) {
      availability = {
        workingHours: {
          monday: { start: '09:00', end: '18:00', isActive: true },
          tuesday: { start: '09:00', end: '18:00', isActive: true },
          wednesday: { start: '09:00', end: '18:00', isActive: true },
          thursday: { start: '09:00', end: '18:00', isActive: true },
          friday: { start: '09:00', end: '18:00', isActive: true },
          saturday: { start: '09:00', end: '14:00', isActive: false },
          sunday: { start: '09:00', end: '14:00', isActive: false }
        },
        slotDuration: 30,
        bufferTime: 0,
        maxVisitsPerSlot: 3,
        blockedDates: [],
        isActive: true
      };
    }

    // Generate slots for date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slotsByDate = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      const dayOfWeek = date.getDay();
      const dayName = dayNames[dayOfWeek];
      const workingDay = availability.workingHours[dayName];

      // Skip if day is not active
      if (!workingDay || !workingDay.isActive) {
        slotsByDate.push({
          date: date.toISOString().split('T')[0],
          dayOfWeek,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          isAvailable: false,
          reason: 'Not a working day',
          slots: []
        });
        continue;
      }

      // Check if date is blocked
      const isBlocked = availability.blockedDates?.some(b => {
        const blockedDate = new Date(b.date);
        return blockedDate.toDateString() === date.toDateString();
      });

      if (isBlocked) {
        const blockedInfo = availability.blockedDates.find(b => {
          const blockedDate = new Date(b.date);
          return blockedDate.toDateString() === date.toDateString();
        });
        slotsByDate.push({
          date: date.toISOString().split('T')[0],
          dayOfWeek,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          isAvailable: false,
          reason: blockedInfo?.reason || 'Blocked',
          slots: []
        });
        continue;
      }

      // Skip past dates
      if (date < today) {
        slotsByDate.push({
          date: date.toISOString().split('T')[0],
          dayOfWeek,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          isAvailable: false,
          reason: 'Past date',
          slots: []
        });
        continue;
      }

      // Generate time slots
      const slots = generateTimeSlots(
        workingDay.start,
        workingDay.end,
        availability.slotDuration,
        availability.bufferTime
      );

      // Get booked visits for this date
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const bookedVisits = await Visit.find({
        companyId: office.companyId,
        officeId: officeId,
        scheduledDate: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['pending', 'approved'] }
      });

      // Create booking count map
      const bookingCount = {};
      bookedVisits.forEach(visit => {
        if (visit.scheduledTime) {
          bookingCount[visit.scheduledTime] = (bookingCount[visit.scheduledTime] || 0) + 1;
        }
      });

      // Mark slots with availability
      const availableSlots = slots.map(slot => {
        const booked = bookingCount[slot.time] || 0;
        return {
          ...slot,
          bookedCount: booked,
          availableSpots: Math.max(0, availability.maxVisitsPerSlot - booked),
          isAvailable: booked < availability.maxVisitsPerSlot
        };
      });

      slotsByDate.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        isAvailable: true,
        slots: availableSlots
      });
    }

    res.status(200).json({
      success: true,
      data: {
        office: {
          _id: office._id,
          name: office.name,
          address: office.address
        },
        availability: {
          slotDuration: availability.slotDuration,
          maxVisitsPerSlot: availability.maxVisitsPerSlot
        },
        slotsByDate
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all availabilities for company
 * @route   GET /api/offices/availabilities
 * @access  Private (company_superadmin, partner_manager)
 */
export const getAllAvailabilities = async (req, res, next) => {
  try {
    const offices = await OfficeLocation.find({
      companyId: req.user.companyId,
      isActive: true
    }).sort({ displayOrder: 1, name: 1 });

    const availabilities = await OfficeAvailability.find({
      companyId: req.user.companyId
    });

    // Map office ID to availability
    const availabilityMap = {};
    availabilities.forEach(a => {
      availabilityMap[a.officeId.toString()] = a;
    });

    const result = offices.map(office => ({
      office: {
        _id: office._id,
        name: office.name,
        address: office.address,
        phone: office.phone,
        email: office.email
      },
      availability: availabilityMap[office._id.toString()] || null,
      hasCustomAvailability: !!availabilityMap[office._id.toString()]
    }));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate time slots between start and end time
 */
function generateTimeSlots(startTime, endTime, duration, buffer) {
  const slots = [];

  // Parse time strings (HH:MM format)
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes + duration <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;

    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    const displayTime = formatTime(timeStr);

    slots.push({
      time: timeStr,
      displayTime,
      duration
    });

    currentMinutes += duration + buffer;
  }

  return slots;
}

/**
 * Format time string to display format
 */
function formatTime(timeStr) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

export default {
  getAvailability,
  updateAvailability,
  addBlockedDate,
  removeBlockedDate,
  getAvailableSlotsForOffice,
  getAllAvailabilities
};