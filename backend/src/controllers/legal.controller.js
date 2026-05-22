import LegalPage from '../models/LegalPage.js';
import { ApiError } from '../middlewares/error.middleware.js';

/**
 * @desc    Get all legal pages (Platform Admin)
 * @route   GET /api/legal
 * @access  Private (Platform Admin)
 */
export const getAllLegalPages = async (req, res, next) => {
  try {
    const pages = await LegalPage.find()
      .populate('updatedBy', 'firstName lastName email')
      .sort({ slug: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: pages,
    });
  } catch (error) {
    next(error);
  }
};

// Default page content when not found in database
const getDefaultPageContent = (slug) => {
  const defaults = {
    'privacy-policy': {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      content: `<h1>Privacy Policy</h1>
<p><strong>Last updated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
<h2>1. Information We Collect</h2>
<p>We collect information you provide directly to us, such as when you create an account, fill out a form, or communicate with us.</p>
<h2>2. How We Use Your Information</h2>
<p>We use the information we collect to provide, maintain, and improve our services.</p>
<h2>3. Information Sharing</h2>
<p>We do not sell your personal information. We may share your information with service providers who assist in operating our platform.</p>
<h2>4. Data Security</h2>
<p>We implement appropriate security measures to protect your personal information.</p>
<h2>5. Contact Us</h2>
<p>If you have any questions about this Privacy Policy, please contact us.</p>`,
    },
    'terms-of-service': {
      slug: 'terms-of-service',
      title: 'Terms of Service',
      content: `<h1>Terms of Service</h1>
<p><strong>Last updated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
<h2>1. Acceptance of Terms</h2>
<p>By accessing and using our platform, you accept and agree to be bound by these Terms of Service.</p>
<h2>2. Use of Service</h2>
<p>You agree to use our platform only for lawful purposes and in accordance with these Terms.</p>
<h2>3. Account Registration</h2>
<p>To use certain features, you must register for an account with accurate and complete information.</p>
<h2>4. Prohibited Activities</h2>
<p>You may not use our platform for illegal purposes or to violate the rights of others.</p>
<h2>5. Contact Us</h2>
<p>If you have any questions about these Terms, please contact us.</p>`,
    },
    'cookie-policy': {
      slug: 'cookie-policy',
      title: 'Cookie Policy',
      content: `<h1>Cookie Policy</h1>
<p><strong>Last updated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
<h2>What Are Cookies?</h2>
<p>Cookies are small text files that are stored on your device when you visit our website.</p>
<h2>How We Use Cookies</h2>
<p>We use cookies for essential platform functionality, analytics, and marketing purposes.</p>
<h2>Your Cookie Choices</h2>
<p>You can control cookies through your browser settings. Please note that blocking certain cookies may affect your ability to use some features.</p>
<h2>Contact Us</h2>
<p>If you have questions about our use of cookies, please contact us.</p>`,
    },
  };
  return defaults[slug] || null;
};

/**
 * @desc    Get a single legal page by slug (Public)
 * @route   GET /api/legal/:slug
 * @access  Public
 */
export const getLegalPageBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    // Validate slug
    const validSlugs = ['privacy-policy', 'terms-of-service', 'cookie-policy'];
    if (!validSlugs.includes(slug)) {
      throw new ApiError(404, 'Page not found');
    }

    let page = await LegalPage.findOne({ slug }).lean();

    // If page doesn't exist in database, return default content
    if (!page) {
      page = getDefaultPageContent(slug);
    }

    res.status(200).json({
      success: true,
      data: page,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create or update a legal page (Platform Admin)
 * @route   PUT /api/legal/:slug
 * @access  Private (Platform Admin)
 */
export const upsertLegalPage = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
      throw new ApiError(400, 'Title and content are required');
    }

    // Validate slug
    const validSlugs = ['privacy-policy', 'terms-of-service', 'cookie-policy'];
    if (!validSlugs.includes(slug)) {
      throw new ApiError(400, 'Invalid page slug. Must be one of: privacy-policy, terms-of-service, cookie-policy');
    }

    const existingPage = await LegalPage.findOne({ slug });
    let page;

    if (existingPage) {
      // Update existing page
      existingPage.title = title;
      existingPage.content = content;
      existingPage.updatedBy = req.user._id;
      page = await existingPage.save();
    } else {
      // Create new page
      page = await LegalPage.create({
        slug,
        title,
        content,
        updatedBy: req.user._id,
      });
    }

    await page.populate('updatedBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: existingPage ? 'Page updated successfully' : 'Page created successfully',
      data: page,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a legal page (Platform Admin)
 * @route   DELETE /api/legal/:slug
 * @access  Private (Platform Admin)
 */
export const deleteLegalPage = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const page = await LegalPage.findOneAndDelete({ slug });

    if (!page) {
      throw new ApiError(404, 'Page not found');
    }

    res.status(200).json({
      success: true,
      message: 'Page deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initialize default legal pages
 * @access  Internal (called on server start)
 */
export const initializeDefaultPages = async () => {
  const defaultPages = [
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      content: `<h1>Privacy Policy</h1>
<p><strong>Last updated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

<h2>1. Information We Collect</h2>
<p>We collect information you provide directly to us, such as when you create an account, fill out a form, or communicate with us. This may include:</p>
<ul>
  <li>Name and contact information (email, phone number)</li>
  <li>Company information (for business accounts)</li>
  <li>Property listings and related data</li>
  <li>Communication preferences</li>
</ul>

<h2>2. How We Use Your Information</h2>
<p>We use the information we collect to:</p>
<ul>
  <li>Provide, maintain, and improve our services</li>
  <li>Communicate with you about updates and promotions</li>
  <li>Process transactions and send related information</li>
  <li>Protect our users and services from fraud</li>
  <li>Comply with legal obligations</li>
</ul>

<h2>3. Information Sharing</h2>
<p>We do not sell your personal information. We may share your information with:</p>
<ul>
  <li>Service providers who assist in operating our platform</li>
  <li>Business partners with your consent</li>
  <li>Law enforcement when required by law</li>
</ul>

<h2>4. Data Security</h2>
<p>We implement appropriate security measures to protect your personal information from unauthorized access, alteration, or disclosure. However, no method of transmission over the internet is 100% secure.</p>

<h2>5. Your Rights</h2>
<p>You have the right to:</p>
<ul>
  <li>Access and update your personal information</li>
  <li>Request deletion of your data</li>
  <li>Opt-out of marketing communications</li>
  <li>Export your data in a portable format</li>
</ul>

<h2>6. Cookies and Tracking</h2>
<p>We use cookies and similar tracking technologies to collect information about your browsing activities. You can control cookie settings through your browser preferences.</p>

<h2>7. Contact Us</h2>
<p>If you have any questions about this Privacy Policy, please contact us through our platform or email us at privacy@channelpartner.com</p>`,
    },
    {
      slug: 'terms-of-service',
      title: 'Terms of Service',
      content: `<h1>Terms of Service</h1>
<p><strong>Last updated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

<h2>1. Acceptance of Terms</h2>
<p>By accessing and using our platform, you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our platform.</p>

<h2>2. Use of Service</h2>
<p>You agree to use our platform only for lawful purposes and in accordance with these Terms. You are responsible for:</p>
<ul>
  <li>Maintaining the confidentiality of your account credentials</li>
  <li>All activities that occur under your account</li>
  <li>Ensuring your use complies with applicable laws</li>
</ul>

<h2>3. Account Registration</h2>
<p>To use certain features, you must register for an account. You agree to:</p>
<ul>
  <li>Provide accurate and complete information</li>
  <li>Update your information as needed</li>
  <li>Not share your account credentials with others</li>
</ul>

<h2>4. User Content</h2>
<p>You retain ownership of content you create on our platform. By posting content, you grant us a license to use, modify, and display such content in connection with our services. You are responsible for ensuring your content does not violate any laws or third-party rights.</p>

<h2>5. Prohibited Activities</h2>
<p>You may not use our platform to:</p>
<ul>
  <li>Distribute malware or malicious code</li>
  <li>Send spam or unsolicited communications</li>
  <li>Violate intellectual property rights</li>
  <li>Engage in fraudulent activities</li>
  <li>Interfere with platform operations</li>
</ul>

<h2>6. Subscription and Payments</h2>
<p>Some features require a paid subscription. By subscribing, you agree to pay the applicable fees. Subscriptions automatically renew unless cancelled before the renewal date.</p>

<h2>7. Termination</h2>
<p>We reserve the right to terminate or suspend your account at any time for:</p>
<ul>
  <li>Violation of these Terms</li>
  <li>Fraudulent activity</li>
  <li>Extended periods of inactivity</li>
  <li>Any other reason at our discretion</li>
</ul>

<h2>8. Limitation of Liability</h2>
<p>Our platform is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of our platform.</p>

<h2>9. Changes to Terms</h2>
<p>We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms on our platform. Continued use after changes constitutes acceptance.</p>

<h2>10. Governing Law</h2>
<p>These Terms are governed by the laws of the jurisdiction in which our company is registered, without regard to conflict of law principles.</p>

<h2>11. Contact Us</h2>
<p>If you have any questions about these Terms, please contact us at legal@channelpartner.com</p>`,
    },
    {
      slug: 'cookie-policy',
      title: 'Cookie Policy',
      content: `<h1>Cookie Policy</h1>
<p><strong>Last updated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

<h2>What Are Cookies?</h2>
<p>Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our platform.</p>

<h2>How We Use Cookies</h2>
<p>We use cookies for the following purposes:</p>

<h3>Essential Cookies</h3>
<p>These cookies are necessary for the platform to function properly. They enable basic features like:</p>
<ul>
  <li>User authentication and session management</li>
  <li>Security and fraud prevention</li>
  <li>Remembering your preferences and settings</li>
</ul>

<h3>Analytics Cookies</h3>
<p>These cookies help us understand how visitors interact with our platform:</p>
<ul>
  <li>Pages visited and time spent</li>
  <li>Features used most frequently</li>
  <li>Error messages encountered</li>
  <li>Performance metrics</li>
</ul>

<h3>Marketing Cookies</h3>
<p>These cookies are used to deliver relevant advertisements:</p>
<ul>
  <li>Tracking conversion from marketing campaigns</li>
  <li>Personalizing content based on interests</li>
  <li>Limiting how many times you see an ad</li>
</ul>

<h2>Your Cookie Choices</h2>
<p>You can control cookies through your browser settings:</p>
<ul>
  <li>Block all cookies</li>
  <li>Block third-party cookies only</li>
  <li>Delete cookies after each session</li>
  <li>Allow cookies from specific sites</li>
</ul>

<p>Please note that blocking certain cookies may affect your ability to use some features of our platform.</p>

<h2>Third-Party Cookies</h2>
<p>Some cookies are placed by third-party services that appear on our pages. We do not control these cookies. The third-party services include:</p>
<ul>
  <li>Google Analytics (analytics)</li>
  <li>Google Maps (maps functionality)</li>
  <li>Social media platforms (sharing buttons)</li>
</ul>

<h2>Updates to This Policy</h2>
<p>We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated revision date.</p>

<h2>Contact Us</h2>
<p>If you have questions about our use of cookies, please contact us at privacy@channelpartner.com</p>`,
    },
  ];

  for (const defaultPage of defaultPages) {
    const existing = await LegalPage.findOne({ slug: defaultPage.slug });
    if (!existing) {
      await LegalPage.create(defaultPage);
      console.log(`[LegalPages] Created default ${defaultPage.slug}`);
    }
  }
};

export default {
  getAllLegalPages,
  getLegalPageBySlug,
  upsertLegalPage,
  deleteLegalPage,
  initializeDefaultPages,
};