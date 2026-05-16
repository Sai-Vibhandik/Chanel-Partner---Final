import LandingPage from '../models/LandingPage.js';
import { ApiError } from '../middlewares/error.middleware.js';

/**
 * @desc    Get landing page content (public)
 * @route   GET /api/landing
 * @access  Public
 */
export const getLandingPage = async (req, res, next) => {
  try {
    const landingPage = await LandingPage.getSingleton();

    res.status(200).json({
      success: true,
      data: { landingPage }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update landing page content
 * @route   PUT /api/landing
 * @access  Private (Platform Admin only)
 */
export const updateLandingPage = async (req, res, next) => {
  try {
    const {
      hero,
      features,
      howItWorks,
      pricing,
      cta,
      footer,
      navigation,
      seo
    } = req.body;

    const landingPage = await LandingPage.getSingleton();

    // Update sections if provided
    if (hero) {
      landingPage.hero = { ...landingPage.hero.toObject(), ...hero };
    }
    if (features) {
      landingPage.features = { ...landingPage.features.toObject(), ...features };
    }
    if (howItWorks) {
      landingPage.howItWorks = { ...landingPage.howItWorks.toObject(), ...howItWorks };
    }
    if (pricing) {
      landingPage.pricing = { ...landingPage.pricing.toObject(), ...pricing };
    }
    if (cta) {
      landingPage.cta = { ...landingPage.cta.toObject(), ...cta };
    }
    if (footer) {
      landingPage.footer = { ...landingPage.footer.toObject(), ...footer };
    }
    if (navigation) {
      landingPage.navigation = { ...landingPage.navigation.toObject(), ...navigation };
    }
    if (seo) {
      landingPage.seo = { ...landingPage.seo.toObject(), ...seo };
    }

    landingPage.updatedBy = req.user._id;
    await landingPage.save();

    res.status(200).json({
      success: true,
      message: 'Landing page updated successfully',
      data: { landingPage }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset landing page to defaults
 * @route   POST /api/landing/reset
 * @access  Private (Platform Admin only)
 */
export const resetLandingPage = async (req, res, next) => {
  try {
    await LandingPage.deleteMany({});
    const landingPage = await LandingPage.create({});

    res.status(200).json({
      success: true,
      message: 'Landing page reset to defaults',
      data: { landingPage }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getLandingPage,
  updateLandingPage,
  resetLandingPage
};