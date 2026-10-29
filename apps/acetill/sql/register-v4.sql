-- Acetill v4 UI package (Acetill-owned Cart; v3 remains immutable). Execute only through authorised release/publisher tooling.
-- This does not grant licences or install Acetill for any tenant.
-- Checkout and receipt actions fail closed until their named Autolaunched Flows are active and authorised.
BEGIN;
INSERT INTO md_apps(api_name,label,enabled)
VALUES ('Acetill','Acetill',true)
ON CONFLICT (api_name) DO NOTHING;

INSERT INTO md_app_package_versions(app_id,version,published,description,brand_color)
SELECT id,4,true,'Acetill POS pages using MetaDrive authentication, data, permissions and Flows.','#1769D2'
FROM md_apps WHERE api_name='Acetill'
ON CONFLICT (app_id,version) DO UPDATE SET published=EXCLUDED.published;

-- The app installer materialises these pages into tenant SQL only on installation.
INSERT INTO md_app_package_page_templates(app_id,version,api_name,title)
SELECT a.id,4,v.api_name,v.title FROM md_apps a
CROSS JOIN (VALUES
 ('AcetillRegister','Register'),
 ('AcetillSale','New Sale'),
 ('AcetillCheckout','Checkout'),
 ('AcetillReceipt','Receipt')
) v(api_name,title)
WHERE a.api_name='Acetill'
ON CONFLICT DO NOTHING;

INSERT INTO md_app_package_home_page_templates(app_id,version,page_api,form_factor)
SELECT a.id,4,'AcetillRegister',f.form_factor
FROM md_apps a CROSS JOIN (VALUES ('desktop'),('phone')) f(form_factor)
WHERE a.api_name='Acetill'
ON CONFLICT DO NOTHING;

INSERT INTO md_app_package_navigation(app_id,version,entry_type,api_name,sort_order)
SELECT a.id,4,'App Page',v.api_name,v.sort_order FROM md_apps a
CROSS JOIN (VALUES
 ('AcetillRegister',10),
 ('AcetillSale',20),
 ('AcetillCheckout',30),
 ('AcetillReceipt',40)
) v(api_name,sort_order)
WHERE a.api_name='Acetill'
ON CONFLICT DO NOTHING;

INSERT INTO md_app_package_resources(app_id,version,resource_type,api_name,parent_api)
SELECT a.id,4,'App Page',p.api_name,'' FROM md_apps a
CROSS JOIN (VALUES ('AcetillRegister'),('AcetillSale'),('AcetillCheckout'),('AcetillReceipt')) p(api_name)
WHERE a.api_name='Acetill'
ON CONFLICT DO NOTHING;

-- Each tenant must already have the canonical shared objects before Acetill installs.
INSERT INTO md_app_package_resources(app_id,version,resource_type,api_name,parent_api)
SELECT a.id,4,'Object',o.api_name,'' FROM md_apps a
CROSS JOIN (VALUES ('Product'),('Cart'),('CartLine'),('Order'),('OrderLine')) o(api_name)
WHERE a.api_name='Acetill'
ON CONFLICT DO NOTHING;

INSERT INTO md_app_package_resources(app_id,version,resource_type,api_name,parent_api)
SELECT a.id,4,'Field',f.api_name,'Product' FROM md_apps a
CROSS JOIN (VALUES ('Name'),('Price'),('Active')) f(api_name)
WHERE a.api_name='Acetill'
ON CONFLICT DO NOTHING;

-- Reuse only the five app-page components required by Acetill.
-- The package installer resolves each required Component against tenant SQL.
INSERT INTO md_app_package_resources(app_id,version,resource_type,api_name,parent_api)
SELECT a.id,4,'Component',c.api_name,'' FROM md_apps a
CROSS JOIN (VALUES ('acetill_input'),('acetill_search'),('acetill_item_grid'),('acetill_cart'),('acetill_button')) c(api_name)
WHERE a.api_name='Acetill'
ON CONFLICT DO NOTHING;

-- Acetill owns the Cart component identity; the existing renderer is bundled internally.
INSERT INTO md_app_package_component_templates(app_id,version,api_name,renderer_key)
SELECT a.id,4,c.api_name,'one-bundled:'||c.api_name
FROM md_apps a CROSS JOIN (VALUES
 ('acetill_input'),('acetill_search'),('acetill_item_grid'),('acetill_button'),('acetill_cart')
) c(api_name) WHERE a.api_name='Acetill'
ON CONFLICT DO NOTHING;

-- SQL-backed, editable published page component instances.
INSERT INTO md_app_package_page_component_templates(app_id,version,page_api,component_api,slot,sort_order)
SELECT a.id,4,p.page_api,p.component_api,p.slot,p.sort_order
FROM md_apps a
CROSS JOIN (VALUES
 ('AcetillRegister','acetill_input','main',10),
 ('AcetillRegister','acetill_input','main',15),
 ('AcetillRegister','acetill_button','main',20),
 ('AcetillSale','acetill_input','header',5),
 ('AcetillSale','acetill_search','main',10),
 ('AcetillSale','acetill_item_grid','main',20),
 ('AcetillSale','acetill_cart','sidebar',30),
 ('AcetillCheckout','acetill_input','header',5),
 ('AcetillCheckout','acetill_cart','main',10),
 ('AcetillCheckout','acetill_button','main',20),
 ('AcetillReceipt','acetill_input','main',10),
 ('AcetillReceipt','acetill_input','main',20),
 ('AcetillReceipt','acetill_button','main',30)
) p(page_api,component_api,slot,sort_order)
WHERE a.api_name='Acetill'
ON CONFLICT DO NOTHING;

-- Declarative properties, not application-specific TypeScript render branches.
INSERT INTO md_app_package_page_property_templates
 (app_id,version,page_api,component_api,slot,sort_order,property_path,data_type,value_text)
SELECT a.id,4,p.page_api,p.component_api,p.slot,p.sort_order,p.property_path,p.data_type,p.value_text
FROM md_apps a
CROSS JOIN (VALUES
 ('AcetillRegister','acetill_input','main',10,'value','string','Welcome to Acetill'),
 ('AcetillRegister','acetill_input','main',10,'allowTyping','boolean','false'),
 ('AcetillRegister','acetill_input','main',10,'fontSize','number','28'),
 ('AcetillRegister','acetill_input','main',15,'value','string','Your products, registers and transaction permissions are managed by UNE Solutions.'),
 ('AcetillRegister','acetill_input','main',15,'allowTyping','boolean','false'),
 ('AcetillRegister','acetill_button','main',20,'label','string','Start a sale'),
 ('AcetillRegister','acetill_button','main',20,'disabled','boolean','false'),
 ('AcetillRegister','acetill_button','main',20,'actionFlows','object',NULL),
 ('AcetillRegister','acetill_button','main',20,'actionFlows.click','object',NULL),
 ('AcetillRegister','acetill_button','main',20,'actionFlows.click.actionType','string','Navigate'),
 ('AcetillRegister','acetill_button','main',20,'actionFlows.click.navigationTargetType','string','App Page'),
 ('AcetillRegister','acetill_button','main',20,'actionFlows.click.navigationPageApiName','string','AcetillSale'),
 ('AcetillSale','acetill_input','header',5,'value','string','New sale'),
 ('AcetillSale','acetill_input','header',5,'allowTyping','boolean','false'),
 ('AcetillSale','acetill_search','main',10,'placeholder','string','Search products or scan a barcode'),
 ('AcetillSale','acetill_search','main',10,'searchKey','string','acetill-catalogue'),
 ('AcetillSale','acetill_item_grid','main',20,'title','string','Products'),
 ('AcetillSale','acetill_item_grid','main',20,'showHeading','boolean','false'),
 ('AcetillSale','acetill_item_grid','main',20,'currencyCode','string','GBP'),
 ('AcetillSale','acetill_item_grid','main',20,'recordActiveFieldApiName','string','Active'),
 ('AcetillSale','acetill_item_grid','main',20,'selectionBehavior','string','add'),
 ('AcetillSale','acetill_item_grid','main',20,'objectApiName','string','Product'),
 ('AcetillSale','acetill_item_grid','main',20,'titleFieldApiName','string','Name'),
 ('AcetillSale','acetill_item_grid','main',20,'priceFieldApiName','string','Price'),
 ('AcetillSale','acetill_item_grid','main',20,'searchKey','string','acetill-catalogue'),
 ('AcetillSale','acetill_item_grid','main',20,'cartTargetKey','string','acetill'),
 ('AcetillSale','acetill_cart','sidebar',30,'title','string','Current sale'),
 ('AcetillSale','acetill_cart','sidebar',30,'viewMode','string','basket'),
 ('AcetillSale','acetill_cart','sidebar',30,'currencyCode','string','GBP'),
 ('AcetillSale','acetill_cart','sidebar',30,'nameFieldApiName','string','Name'),
 ('AcetillSale','acetill_cart','sidebar',30,'priceFieldApiName','string','Price'),
 ('AcetillSale','acetill_cart','sidebar',30,'cartTargetKey','string','acetill'),
 ('AcetillSale','acetill_cart','sidebar',30,'checkoutLabel','string','Complete sale'),
 ('AcetillSale','acetill_cart','sidebar',30,'checkoutStatusOutput','string','status'),
 ('AcetillSale','acetill_cart','sidebar',30,'checkoutRequestOutput','string','requestId'),
 ('AcetillSale','acetill_cart','sidebar',30,'checkoutMessageOutput','string','message'),
 ('AcetillSale','acetill_cart','sidebar',30,'checkoutChangeOutput','string','changeDueMinor'),
 ('AcetillSale','acetill_cart','sidebar',30,'actionFlows','object',NULL),
 ('AcetillSale','acetill_cart','sidebar',30,'actionFlows.checkout','object',NULL),
 ('AcetillSale','acetill_cart','sidebar',30,'actionFlows.checkout.flowApiName','string','AcetillCompleteSale'),
 ('AcetillSale','acetill_cart','sidebar',30,'actionFlows.checkout.flowType','string','Autolaunched Flow'),
 ('AcetillSale','acetill_cart','sidebar',30,'actionFlows.checkout.inputs','object',NULL),
 ('AcetillSale','acetill_cart','sidebar',30,'actionFlows.checkout.inputs.checkoutRequest','string','$event'),
 ('AcetillSale','acetill_cart','sidebar',30,'actionFlows.checkout.outputs','object',NULL),
 ('AcetillSale','acetill_cart','sidebar',30,'actionFlows.checkout.outputs.status','string','checkoutStatus'),
 ('AcetillSale','acetill_cart','sidebar',30,'actionFlows.checkout.outputs.requestId','string','checkoutRequestId'),
 ('AcetillSale','acetill_cart','sidebar',30,'actionFlows.checkout.outputs.message','string','checkoutMessage'),
 ('AcetillSale','acetill_cart','sidebar',30,'actionFlows.checkout.outputs.changeDueMinor','string','checkoutChangeDueMinor'),
 ('AcetillSale','acetill_cart','sidebar',30,'actionFlows.checkout.outputs.orderId','string','orderId'),
 ('AcetillCheckout','acetill_input','header',5,'value','string','Review your sale'),
 ('AcetillCheckout','acetill_input','header',5,'allowTyping','boolean','false'),
 ('AcetillCheckout','acetill_cart','main',10,'title','string','Checkout'),
 ('AcetillCheckout','acetill_cart','main',10,'viewMode','string','basket'),
 ('AcetillCheckout','acetill_cart','main',10,'nameFieldApiName','string','Name'),
 ('AcetillCheckout','acetill_cart','main',10,'priceFieldApiName','string','Price'),
 ('AcetillCheckout','acetill_cart','main',10,'currencyCode','string','GBP'),
 ('AcetillCheckout','acetill_cart','main',10,'cartTargetKey','string','acetill'),
 ('AcetillCheckout','acetill_cart','main',10,'checkoutLabel','string','Complete sale'),
 ('AcetillCheckout','acetill_cart','main',10,'checkoutStatusOutput','string','status'),
 ('AcetillCheckout','acetill_cart','main',10,'checkoutRequestOutput','string','requestId'),
 ('AcetillCheckout','acetill_cart','main',10,'checkoutMessageOutput','string','message'),
 ('AcetillCheckout','acetill_cart','main',10,'checkoutChangeOutput','string','changeDueMinor'),
 ('AcetillCheckout','acetill_cart','main',10,'actionFlows','object',NULL),
 ('AcetillCheckout','acetill_cart','main',10,'actionFlows.checkout','object',NULL),
 ('AcetillCheckout','acetill_cart','main',10,'actionFlows.checkout.flowApiName','string','AcetillCompleteSale'),
 ('AcetillCheckout','acetill_cart','main',10,'actionFlows.checkout.flowType','string','Autolaunched Flow'),
 ('AcetillCheckout','acetill_cart','main',10,'actionFlows.checkout.inputs','object',NULL),
 ('AcetillCheckout','acetill_cart','main',10,'actionFlows.checkout.inputs.checkoutRequest','string','$event'),
 ('AcetillCheckout','acetill_cart','main',10,'actionFlows.checkout.outputs','object',NULL),
 ('AcetillCheckout','acetill_cart','main',10,'actionFlows.checkout.outputs.status','string','checkoutStatus'),
 ('AcetillCheckout','acetill_cart','main',10,'actionFlows.checkout.outputs.requestId','string','checkoutRequestId'),
 ('AcetillCheckout','acetill_cart','main',10,'actionFlows.checkout.outputs.message','string','checkoutMessage'),
 ('AcetillCheckout','acetill_cart','main',10,'actionFlows.checkout.outputs.changeDueMinor','string','checkoutChangeDueMinor'),
 ('AcetillCheckout','acetill_cart','main',10,'actionFlows.checkout.outputs.orderId','string','orderId'),
 ('AcetillCheckout','acetill_button','main',20,'label','string','Return to sale'),
 ('AcetillCheckout','acetill_button','main',20,'disabled','boolean','false'),
 ('AcetillCheckout','acetill_button','main',20,'actionFlows','object',NULL),
 ('AcetillCheckout','acetill_button','main',20,'actionFlows.click','object',NULL),
 ('AcetillCheckout','acetill_button','main',20,'actionFlows.click.actionType','string','Navigate'),
 ('AcetillCheckout','acetill_button','main',20,'actionFlows.click.navigationTargetType','string','App Page'),
 ('AcetillCheckout','acetill_button','main',20,'actionFlows.click.navigationPageApiName','string','AcetillSale'),
 ('AcetillReceipt','acetill_input','main',10,'value','string','Receipt'),
 ('AcetillReceipt','acetill_input','main',10,'allowTyping','boolean','false'),
 ('AcetillReceipt','acetill_input','main',10,'fontSize','number','28'),
 ('AcetillReceipt','acetill_input','main',20,'value','string','Only a confirmed Order can be printed. MetaDrive verifies the active receipt Flow and record permissions.'),
 ('AcetillReceipt','acetill_input','main',20,'allowTyping','boolean','false'),
 ('AcetillReceipt','acetill_button','main',30,'label','string','Print receipt'),
 ('AcetillReceipt','acetill_button','main',30,'disabled','boolean','false'),
 ('AcetillReceipt','acetill_button','main',30,'actionFlows','object',NULL),
 ('AcetillReceipt','acetill_button','main',30,'actionFlows.click','object',NULL),
 ('AcetillReceipt','acetill_button','main',30,'actionFlows.click.flowApiName','string','AcetillPrintReceipt'),
 ('AcetillReceipt','acetill_button','main',30,'actionFlows.click.flowType','string','Autolaunched Flow'),
 ('AcetillReceipt','acetill_button','main',30,'actionFlows.click.inputs','object',NULL),
 ('AcetillReceipt','acetill_button','main',30,'actionFlows.click.inputs.orderId','string','$state.orderId')
) p(page_api,component_api,slot,sort_order,property_path,data_type,value_text)
WHERE a.api_name='Acetill'
ON CONFLICT DO NOTHING;

COMMIT;
