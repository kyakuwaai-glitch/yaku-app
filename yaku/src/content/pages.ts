// Starter content. Admins can override any page in Admin > Pages (saved to the `pages` table).
export const DEFAULT_UPDATED = '2026-11-14'
export const defaultSettings = { business_name: 'SABULA MEDIA', address: 'Nasser Road, Kampala', phone: '+256 743 824 988', email: '', facebook: '', instagram: '', x: '' }
export type PageDef = { t: string; b: string; k?: 'form' | 'campaign'; f?: string }
export const footerColumns: [string, [string, string][]][] = [
  ['About YAKU Uganda', [['About Us', 'about'], ['Yaku Careers', 'careers'], ['Black Friday', 'black-friday'], ['IPR Protection Policy', 'ipr'], ['Terms and Conditions', 'terms'], ['Store & Credit Terms', 'credit-terms'], ['Dispute Resolution Policy', 'disputes'], ['Privacy Policy Notice', 'privacy'], ['Cookie Notice', 'cookies'], ['Return & Refund Policy', 'refunds'], ['Flash Sales', 'flash-sales']]],
  ['Customer Support', [['Help Center', 'help'], ['Contact Us', 'contact'], ['Frequently Asked Questions', 'faq'], ['Place an Order', 'place-order'], ['Track My Order', 'track-order'], ['Payment Information', 'payment'], ['Shipping & Delivery', 'shipping'], ['Returns and Refunds', 'refunds'], ['Report a Product', 'report-product'], ['Create a Return', 'create-return']]],
  ['Make Money with YAKU', [['Sell on YAKU', 'sell'], ['Vendor Hub', 'vendor-hub'], ['Become a Sales Consultant', 'consultant'], ['Become a YAKU Pickup Station Partner', 'pickup-partner'], ['Designer Registration', 'designer-registration'], ['Vendor Registration', 'vendor-registration'], ['Partner With YAKU', 'partner']]],
]
export const defaultPages: Record<string, PageDef> = {
about: { t: 'About YAKU Uganda', b: `## Who we are
YAKU Uganda is a modern online marketplace that brings stationery, office equipment, printing, branding and graphic design services together on one convenient platform.
Our goal is to make it easier for individuals, businesses, schools, organizations and entrepreneurs to access quality products and professional creative services.
YAKU operates a hybrid marketplace. You can buy products and services directly from YAKU, and you can discover products and services from approved independent vendors and professional designers.
## What we offer
- Stationery and office supplies
- Printers and photocopiers
- Printing materials, inks and toners
- Professional printing services
- Branding and promotional materials
- Graphic design services
- Business cards, banners, flyers and stickers
- Customized T-shirts, mugs and promotional products
- Office equipment and accessories
## Our mission
To simplify access to quality stationery, printing, branding and creative services through a convenient, reliable and accessible digital marketplace.
## Our vision
To become a trusted destination in Uganda for stationery, printing, branding and creative business solutions.
## Why choose YAKU?
- Convenient online shopping
- Wide product selection
- Access to independent vendors and designers
- Easy ordering and quotation requests
- Convenient payment options
- Customer support and order assistance
## Our commitment
We are committed to a convenient shopping experience, to supporting local businesses, to creating opportunities for independent vendors and designers, and to helping customers bring their ideas to life.
**YAKU Uganda – Your Complete Creative and Office Marketplace.**` },
careers: { t: 'Careers at YAKU', k: 'form', f: 'career', b: `YAKU is building a marketplace for stationery, printing, branding and design in Uganda. We welcome talented people and business partners in these areas:
- Graphic design
- Printing and branding
- Sales and marketing
- Customer service
- Technology and software development
- Vendor and business partnerships
- Delivery and logistics
## Current vacancies
We have no vacancies listed at the moment. You can still send us your CV and portfolio below. We will contact you if a suitable opportunity opens.
## Apply or introduce yourself` },
'black-friday': { t: 'Black Friday', k: 'campaign', f: 'black_friday', b: `Black Friday at YAKU can include offers on selected stationery, printers and office equipment, printing and branding services, and promotions from independent vendors. Offers are limited by time and stock.
Every price, discount and date on this page comes from the live campaign set up by YAKU. If no campaign is running, none is shown.` },
'flash-sales': { t: 'Flash Sales', k: 'campaign', f: 'flash_sale', b: `Flash sales are limited-time offers on stationery, printing equipment, office equipment, printing materials, branding products and vendor promotions.
Discount percentages are calculated from each item's regular price and its promotional price. Expired campaigns are never shown.` },
ipr: { t: 'Intellectual Property Rights Protection Policy', k: 'form', f: 'ipr', b: `YAKU respects the intellectual property rights of designers, artists, businesses, vendors and customers.
## Ownership of designs
Logos, artwork, photographs, designs and other creative materials remain the property of their owners unless ownership is legally transferred.
## Customer-uploaded artwork
By uploading artwork for printing, you confirm that you own it or have permission to use it. YAKU may refuse or stop a job if there is a reasonable concern about infringement.
## Vendor and designer responsibilities
Vendors and designers must make sure their products, images and creative materials do not unlawfully infringe anyone else's intellectual property rights. Listings that do may be removed and accounts suspended.
## Report a copyright violation
If you believe material on YAKU infringes your copyright, send the details below. Administrators review each complaint and take appropriate action, which may include removing the material and contacting the vendor or designer.` },
terms: { t: 'Terms and Conditions', b: `These terms govern your use of YAKU. Please read them with our [Privacy Policy](/info/privacy) and [Return & Refund Policy](/info/refunds).
## 1. Introduction and acceptance of terms
By accessing or using YAKU you agree to these terms. If you do not agree, please do not use the platform.
## 2. About YAKU Uganda
YAKU operates both as a direct seller of its own products and services and as a marketplace that connects customers with independent vendors and designers. The seller of each item is shown on its listing.
## 3. User registration and accounts
Give accurate information and keep your password secure. You are responsible for activity on your account. Vendor and designer accounts require approval by YAKU.
## 4. Customer responsibilities
Use YAKU lawfully, provide correct contact and delivery details, and check your order before confirming it.
## 5. Product listings and descriptions
We and our vendors aim to describe products accurately. Colours and finishes may vary slightly. Please report errors you notice.
## 6. Independent vendor responsibilities
Vendors are responsible for their listings, stock, pricing, quality, the lawfulness of their goods and fulfilment. YAKU may remove listings or suspend vendors who breach these terms.
## 7. Designer marketplace responsibilities
Designers must deliver services as described, hold the rights to the work they provide, and follow agreed timelines and revisions.
## 8. Orders and order confirmation
An order is confirmed only when YAKU confirms it in your account or by message. We may decline or cancel an order, for example for unavailable stock, a pricing error or suspected fraud.
## 9. Payments and payment verification
An order is treated as paid only after YAKU or its payment provider has verified the payment.
## 10. Pricing and additional charges
Prices are in Uganda shillings (UGX) unless stated. Delivery, printing, design or other charges are shown before you confirm an order.
## 11. Printing and customized orders
Customized items are made to your specification. Production starts after approval and payment. See the [Return & Refund Policy](/info/refunds) for how problems are handled.
## 12. Artwork uploads and customer approvals
You confirm you have the right to use the artwork you upload. Please check proofs carefully. Once you approve a proof, errors in the approved content, such as spelling, are your responsibility. Production faults remain ours.
## 13. Delivery and shipping
Delivery options, charges and estimated times are confirmed when you place an order. Please provide an accurate address.
## 14. Cancellations and refunds
These are governed by the [Return & Refund Policy](/info/refunds).
## 15. Prohibited activities
You must not sell or order unlawful or counterfeit goods, commit fraud, upload harmful or infringing content, misuse or scrape the platform, or harass others.
## 16. Account suspension and termination
We may suspend or end accounts for breaches of these terms, fraud or legal reasons. You may ask us to close your account at any time.
## 17. Intellectual property rights
See our [IPR Protection Policy](/info/ipr).
## 18. Privacy and personal data
See our [Privacy Policy](/info/privacy).
## 19. Limitation of liability
To the extent permitted by Ugandan law, YAKU is not liable for indirect or consequential loss. Nothing in these terms excludes liability that cannot be excluded by law or limits your statutory consumer rights.
## 20. Changes to these terms
We may update these terms. The date at the top of this page shows the latest update. Continued use after a change means you accept it.
## 21. Contact information
{{business_name}}, {{address}}. Phone: {{phone}}. Email: {{email}}.
## 22. Governing law
These terms are governed by the laws of the Republic of Uganda. You keep the right to use external dispute resolution and the courts.` },
'credit-terms': { t: 'Store & Credit Terms', b: `## How purchases work
You can buy products and services from YAKU and from approved vendors and designers. Orders are confirmed and paid as described in our [Terms and Conditions](/info/terms).
## Payment requirements
Payment must be verified before an order is treated as paid. Payment options are shown at checkout.
## Store credit, vouchers and promotional credit
YAKU may add store credit, discount vouchers or promotional credit to your account. Each one is subject to the conditions shown with it, including any expiry date, eligible items and minimum spend. Promotional credit cannot be exchanged for cash unless the conditions say so.
## Balance adjustments and refunds
If an order paid with credit is refunded, the credit is returned to your account where possible, unless it has expired. We may correct balances that were applied in error and will tell you when we do.
## Not a loan or lending service
YAKU does not offer loans, lending or financial credit facilities. Store credit is a balance you can spend on YAKU only.
## Incorrect balances or payment records
If a balance or payment record looks wrong, [contact support](/info/contact) with your order number.` },
disputes: { t: 'Dispute Resolution Policy', k: 'form', f: 'dispute', b: `We want to fix problems quickly and fairly.
## What you can report
- Incorrect or damaged products
- Missing orders and delayed deliveries
- Payment problems
- Printing quality and branding disagreements
- Vendor misconduct and designer service complaints
- Refund requests
## How it works
Submit the form below. An administrator reviews your case, may contact you and the vendor or designer, and records the outcome. Possible resolutions include replacement, reprinting, a refund where applicable, a delivery correction or another appropriate remedy.
## Your legal rights
This process does not limit your legal rights. You may use external dispute resolution or the courts at any time.
## Submit a dispute` },
privacy: { t: 'Privacy Policy Notice', b: `This notice explains how YAKU collects, uses, stores and protects personal information. We handle personal data in line with Uganda's Data Protection and Privacy Act, 2019.
## Information we collect
- Full name, email address and phone number
- Account information and delivery address
- Order history and transaction records
- Uploaded artwork
- Vendor business information
- Customer support communications
## How we use it
- Creating and managing your account
- Processing orders and verifying payments
- Arranging delivery
- Communicating with vendors and designers about your orders
- Customer support
- Preventing fraud
- Improving the platform
- Meeting legal obligations
## Who we share it with
We share only what is needed with payment providers, delivery providers, the vendors and designers fulfilling your order, hosting providers and other service providers that help us run YAKU. We do not sell your personal information.
## AI features
YAKU AI uses OpenAI, a third-party AI provider. If you use the assistant, the Design Studio or the AI artwork review, the text you enter and the files or images you submit are sent to OpenAI to produce replies, designs and checks. This happens only after you agree in the app.
## Deleting your account
You can delete your account inside the app (Account > Delete my account) or at /account/delete.
## Security and retention
We use access controls and secure hosting to protect your data. We keep it only as long as needed for the purposes above or as the law requires.
## Your rights
You may ask to access, correct or delete your personal information, subject to applicable law. [Contact us](/info/contact) to make a request.
## Cookies
See our [Cookie Notice](/info/cookies).
## Changes
We will update this notice when our practices change. The date at the top shows the latest update.
## Contact
{{business_name}}, {{address}}. Email: {{email}}.` },
cookies: { t: 'Cookie Notice', b: `Cookies are small files stored on your device. We use them as follows.
## Essential cookies
Needed for sign-in, shopping carts and basic site functions. They are always on.
## Preference cookies
Remember your settings.
## Analytics cookies
Help us understand site performance and visitor activity.
## Marketing cookies
Support relevant promotions where enabled and where consent is required.
## Your choices
Preference, analytics and marketing cookies stay off until you agree. Your choice is saved in your browser, and you can change it at any time.` },
refunds: { t: 'Return & Refund Policy', b: `## When you can return an item or ask for a refund
- Damaged products
- Incorrect products
- Missing items or incomplete orders
- Products that differ significantly from their description
- Defective equipment
- Printing errors and poor-quality customized products
- Cancelled orders, where the order has not gone into production
## Customized products
Banners, business cards, stickers, branded clothing and other personalized items may not be returned for change of mind once production has begun. Defective, incorrect or non-conforming items and services are always handled fairly under applicable consumer protection law. Nothing in this policy removes your legal rights.
## Vendor-supplied products
Returns for vendor products are handled with the vendor, with YAKU's help. If a vendor does not resolve the issue, use our [dispute process](/info/disputes).
## Refunds
Approved refunds are paid back through the original payment method where possible.
## How to start a return
Use [Create a Return](/info/create-return) with your order number and photos.` },
'printing-request': { t: 'Request a Printing Quotation', k: 'form', f: 'printing', b: `Tell us what you need printed and upload your artwork. We review it and send you a quotation. You approve the quote in your account, and production starts only after your payment has been verified.` },
'create-return': { t: 'Create a Return', k: 'form', f: 'return', b: `Tell us what went wrong and we will review your request under our [Return & Refund Policy](/info/refunds). Photos help us decide faster.` },
'report-product': { t: 'Report a Product', k: 'form', f: 'report', b: `Report a listing that is inaccurate, unsafe, counterfeit or otherwise breaks our rules. For copyright complaints, use the form on the [IPR Protection Policy](/info/ipr) page.` },
contact: { t: 'Contact Us', k: 'form', f: 'contact', b: `Send us a message and our team will reply. You can also reach us at {{business_name}}, {{address}}, phone {{phone}}.` },
help: { t: 'Help Center', b: `- [Place an order](/info/place-order)
- [Track my order](/info/track-order)
- [Payment information](/info/payment)
- [Shipping & delivery](/info/shipping)
- [Returns and refunds](/info/refunds)
- [Frequently asked questions](/info/faq)
- [Contact us](/info/contact)` },
faq: { t: 'Frequently Asked Questions', b: `## Who sells on YAKU?
YAKU sells its own products and services, and approved independent vendors and designers sell on the platform. Each listing shows the seller.
## Can I get a quotation for printing?
Yes. [Contact us](/info/contact) with what you need.
## What if my order is wrong or damaged?
See the [Return & Refund Policy](/info/refunds) and [Create a Return](/info/create-return).
## How do I sell on YAKU?
See [Sell on YAKU](/info/sell).` },
'place-order': { t: 'Place an Order', b: `Browse the departments, choose your products or services, and follow the steps to confirm your order. For custom printing, upload your artwork and approve the proof before production. If you need a quotation first, [contact us](/info/contact).` },
'track-order': { t: 'Track My Order', b: `Order tracking in your account is not available yet. To check an order, [contact us](/info/contact) with your order number.` },
payment: { t: 'Payment Information', b: `Available payment methods are shown at checkout. An order is treated as paid only after YAKU or its payment provider verifies the payment. See the [Store & Credit Terms](/info/credit-terms).` },
shipping: { t: 'Shipping & Delivery', b: `Delivery options, charges and estimated times are confirmed when you place an order. Check that your address and phone number are correct. If an order is late or missing, [open a dispute](/info/disputes).` },
sell: { t: 'Sell on YAKU', b: `Approved independent vendors can list stationery, office equipment, printing materials and branding products on YAKU.
## How to start
- [Register as a vendor](/register)
- YAKU reviews your application
- Once approved, you can manage your listings from your vendor dashboard
Vendors are responsible for their listings and must follow the [Terms and Conditions](/info/terms) and the [IPR Protection Policy](/info/ipr).` },
'vendor-hub': { t: 'Vendor Hub', b: `The Vendor Hub is for approved vendors. Sign in to manage your store, products and orders from your vendor dashboard.
- [Sign in](/login)
- [Apply to become a vendor](/register)
- [Read the vendor responsibilities](/info/terms)` },
'designer-registration': { t: 'Designer Registration', b: `Professional designers can offer services such as logos, flyers, packaging and social media graphics on YAKU. Choose "Offer design services" when you [create your account](/register). YAKU reviews each designer before they are listed.` },
'vendor-registration': { t: 'Vendor Registration', b: `To sell on YAKU, choose "Sell as a vendor" when you [create your account](/register). YAKU reviews each vendor before they are listed. Learn more on [Sell on YAKU](/info/sell).` },
consultant: { t: 'Become a Sales Consultant', k: 'form', f: 'partner', b: `Interested in representing YAKU to businesses, schools and organizations? Tell us about yourself and we will be in touch.` },
'pickup-partner': { t: 'Become a YAKU Pickup Station Partner', k: 'form', f: 'partner', b: `If you run a business where customers could collect YAKU orders, tell us about it and we will be in touch.` },
partner: { t: 'Partner With YAKU', k: 'form', f: 'partner', b: `We welcome partnerships with suppliers, printers, schools, businesses and organizations. Tell us how you would like to work with us.` },
}
