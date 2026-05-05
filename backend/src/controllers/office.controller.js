import OfficeLocation from "../models/OfficeLocation.js";
import TimeSlot from "../models/TimeSlot.js";
import Visit from "../models/Visit.js";
import { ApiError } from "../middlewares/error.middleware.js";

// ==================== OFFICE LOCATIONS ====================

/**
 * @desc    Get all office locations for company
 * @route   GET /api/offices
 * @access  Private (company_superadmin, partner_manager)
 */
export const getOfficeLocations = async (req, res, next) => {
  try {
    const { isActive } = req.query;

    const query = { companyId: req.user.companyId };
    if (isActive !== undefined) query.isActive = isActive === "true";

    const offices = await OfficeLocation.find(query)
      .populate("createdBy", "firstName lastName")
      .sort({ displayOrder: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      data: { offices: offices || [] },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single office location
 * @route   GET /api/offices/:id
 * @access  Private (company_superadmin, partner_manager)
 */
export const getOfficeLocation = async (req, res, next) => {
  try {
    const office = await OfficeLocation.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    }).populate("createdBy", "firstName lastName");

    if (!office) {
      throw new ApiError(404, "Office location not found");
    }

    res.status(200).json({
      success: true,
      data: { office },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create office location
 * @route   POST /api/offices
 * @access  Private (company_superadmin, partner_manager)
 */
export const createOfficeLocation = async (req, res, next) => {
  try {
    const {
      name,
      address,
      phone,
      email,
      googleMapsUrl,
      calendlyUrl,
      operatingHours,
      displayOrder,
    } = req.body;

    const office = await OfficeLocation.create({
      companyId: req.user.companyId,
      name,
      address,
      phone,
      email,
      googleMapsUrl,
      calendlyUrl,
      operatingHours,
      displayOrder: displayOrder || 0,
      createdBy: req.user._id,
    });

    await office.populate("createdBy", "firstName lastName");

    res.status(201).json({
      success: true,
      message: "Office location created successfully",
      data: { office },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update office location
 * @route   PUT /api/offices/:id
 * @access  Private (company_superadmin, partner_manager)
 */
export const updateOfficeLocation = async (req, res, next) => {
  try {
    const {
      name,
      address,
      phone,
      email,
      googleMapsUrl,
      calendlyUrl,
      operatingHours,
      isActive,
      displayOrder,
    } = req.body;

    const office = await OfficeLocation.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!office) {
      throw new ApiError(404, "Office location not found");
    }

    if (name !== undefined) office.name = name;
    if (address !== undefined) office.address = address;
    if (phone !== undefined) office.phone = phone;
    if (email !== undefined) office.email = email;
    if (googleMapsUrl !== undefined) office.googleMapsUrl = googleMapsUrl;
    if (calendlyUrl !== undefined) office.calendlyUrl = calendlyUrl;
    if (operatingHours !== undefined) office.operatingHours = operatingHours;
    if (isActive !== undefined) office.isActive = isActive;
    if (displayOrder !== undefined) office.displayOrder = displayOrder;

    await office.save();
    await office.populate("createdBy", "firstName lastName");

    res.status(200).json({
      success: true,
      message: "Office location updated successfully",
      data: { office },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete office location
 * @route   DELETE /api/offices/:id
 * @access  Private (company_superadmin, partner_manager)
 */
export const deleteOfficeLocation = async (req, res, next) => {
  try {
    const office = await OfficeLocation.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!office) {
      throw new ApiError(404, "Office location not found");
    }

    // Check if any time slots are linked to this office
    const linkedSlots = await TimeSlot.countDocuments({ officeId: office._id });
    if (linkedSlots > 0) {
      // Unlink slots instead of preventing deletion
      await TimeSlot.updateMany(
        { officeId: office._id },
        { $set: { officeId: null } },
      );
    }

    await office.deleteOne();

    res.status(200).json({
      success: true,
      message: "Office location deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ==================== TIME SLOTS ====================

/**
 * @desc    Get all time slots for company
 * @route   GET /api/offices/slots
 * @access  Private (company_superadmin, partner_manager)
 */
export const getTimeSlots = async (req, res, next) => {
  try {
    const { officeId, dayOfWeek, isActive } = req.query;

    const query = { companyId: req.user.companyId };
    if (officeId !== undefined) {
      query.officeId = officeId === "null" ? null : officeId;
    }
    if (dayOfWeek !== undefined) query.dayOfWeek = parseInt(dayOfWeek);
    if (isActive !== undefined) query.isActive = isActive === "true";

    const slots = await TimeSlot.find(query)
      .populate("officeId", "name")
      .populate("createdBy", "firstName lastName")
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      data: { slots },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create time slot
 * @route   POST /api/offices/slots
 * @access  Private (company_superadmin, partner_manager)
 */
export const createTimeSlot = async (req, res, next) => {
  try {
    const {
      name,
      officeId,
      dayOfWeek,
      startTime,
      endTime,
      maxBookings,
      durationMinutes,
    } = req.body;

    // Validate office belongs to company if provided
    if (officeId) {
      const office = await OfficeLocation.findOne({
        _id: officeId,
        companyId: req.user.companyId,
      });
      if (!office) {
        throw new ApiError(400, "Invalid office location");
      }
    }

    const slot = await TimeSlot.create({
      companyId: req.user.companyId,
      name,
      officeId: officeId || null,
      dayOfWeek,
      startTime,
      endTime,
      maxBookings: maxBookings || 1,
      durationMinutes: durationMinutes || 60,
      createdBy: req.user._id,
    });

    await slot.populate("officeId", "name");
    await slot.populate("createdBy", "firstName lastName");

    res.status(201).json({
      success: true,
      message: "Time slot created successfully",
      data: { slot },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update time slot
 * @route   PUT /api/offices/slots/:id
 * @access  Private (company_superadmin, partner_manager)
 */
export const updateTimeSlot = async (req, res, next) => {
  try {
    const {
      name,
      officeId,
      dayOfWeek,
      startTime,
      endTime,
      maxBookings,
      durationMinutes,
      isActive,
    } = req.body;

    const slot = await TimeSlot.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!slot) {
      throw new ApiError(404, "Time slot not found");
    }

    if (name !== undefined) slot.name = name;
    if (officeId !== undefined) slot.officeId = officeId || null;
    if (dayOfWeek !== undefined) slot.dayOfWeek = dayOfWeek;
    if (startTime !== undefined) slot.startTime = startTime;
    if (endTime !== undefined) slot.endTime = endTime;
    if (maxBookings !== undefined) slot.maxBookings = maxBookings;
    if (durationMinutes !== undefined) slot.durationMinutes = durationMinutes;
    if (isActive !== undefined) slot.isActive = isActive;

    await slot.save();
    await slot.populate("officeId", "name");
    await slot.populate("createdBy", "firstName lastName");

    res.status(200).json({
      success: true,
      message: "Time slot updated successfully",
      data: { slot },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete time slot
 * @route   DELETE /api/offices/slots/:id
 * @access  Private (company_superadmin, partner_manager)
 */
export const deleteTimeSlot = async (req, res, next) => {
  try {
    const slot = await TimeSlot.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!slot) {
      throw new ApiError(404, "Time slot not found");
    }

    await slot.deleteOne();

    res.status(200).json({
      success: true,
      message: "Time slot deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get available slots for a specific date
 * @route   GET /api/offices/available-slots
 * @access  Private (company_superadmin, partner_manager, partner)
 */
export const getAvailableSlots = async (req, res, next) => {
  try {
    const { officeId, date } = req.query;

    if (!date) {
      throw new ApiError(400, "Date is required");
    }

    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      return res.status(200).json({
        success: true,
        data: { slots: [], message: "Cannot book slots in the past" },
      });
    }

    const dayOfWeek = requestedDate.getDay();

    // Build query for time slots
    const query = {
      companyId: req.user.companyId,
      dayOfWeek,
      isActive: true,
    };

    // If officeId provided, get slots specific to that office OR general slots
    if (officeId) {
      query.$or = [{ officeId: null }, { officeId: officeId }];
    } else {
      query.officeId = null;
    }

    const slots = await TimeSlot.find(query)
      .populate("officeId", "name address")
      .sort({ startTime: 1 });

    // For each slot, check availability
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const slotsWithAvailability = await Promise.all(
      slots.map(async (slot) => {
        const bookingCount = await Visit.countDocuments({
          companyId: req.user.companyId,
          scheduledDate: { $gte: startOfDay, $lte: endOfDay },
          scheduledTime: slot.startTime,
          ...(officeId && { "officeLocation._id": officeId }),
          status: { $in: ["pending", "approved"] },
        });

        return {
          _id: slot._id,
          name: slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          dayOfWeek: slot.dayOfWeek,
          dayName: slot.dayName,
          maxBookings: slot.maxBookings,
          durationMinutes: slot.durationMinutes,
          officeId: slot.officeId,
          bookedCount: bookingCount,
          availableSpots: Math.max(0, slot.maxBookings - bookingCount),
          isAvailable: bookingCount < slot.maxBookings,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: {
        date,
        dayOfWeek,
        slots: slotsWithAvailability,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get available offices for partner (public)
 * @route   GET /api/offices/available
 * @access  Private (partner)
 */
export const getAvailableOffices = async (req, res, next) => {
  try {
    console.log('getAvailableOffices called by user:', req.user._id, 'role:', req.user.role);

    // For partners, get offices from companies they have partnerships with
    const PartnerCompany = (await import("../models/PartnerCompany.js"))
      .default;

    const partnerships = await PartnerCompany.find({
      partnerId: req.user._id,
      status: "active",
    }).select("companyId");

    console.log('Found partnerships:', partnerships.length);

    const companyIds = partnerships.map((p) => p.companyId);
    console.log('Company IDs:', companyIds);

    const offices = await OfficeLocation.find({
      companyId: { $in: companyIds },
      isActive: true,
    })
      .select("name address phone email googleMapsUrl operatingHours isActive")
      .sort({ displayOrder: 1, name: 1 });

    console.log('Found offices:', offices.length);

    res.status(200).json({
      success: true,
      data: { offices },
    });
  } catch (error) {
    console.error('getAvailableOffices error:', error);
    next(error);
  }
};
