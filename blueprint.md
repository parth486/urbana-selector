# Urbana Selector

Build a WordPress plugin named “Urbana Selector”. It is product configurator. It provides a React + Tailwind interface.

## Core
The two react app already provided, but should be revisioned and enhanced, since they lack performce and optiomization, and dont have connection to WordPress. (folders src/stepper-app and src/data-builder-app). Add zustand for them.
Third react app, which is responsible for managing customer submissions should be created as well (folder src/admin-orders-app).

## Flow

Initial data (demo) taken from src/data/productData.ts, but that is where Data Builder App comes, it saves configuration is same style and that it is used on front end instead of productData.ts. When Customer has filled out the stepper form, his submission data stored in custom database table and visible in Admin Order Management App.

## Front-End (React App – Stepper Form)
- The front-end shows a multi-step stepper form for product selection and configuration.
- Steps include:
	- Select Product Group (e.g., Shelter, Toilet, Bridge, Access)
	- Select Product Range (options depend on the group, e.g., Shelter → Peninsula, Whyalla)
	- Select Individual Product (e.g., Peninsula → K301, K302, K308)
	- View Product Content
		- Product overview text
		- Image gallery
		- Downloadable files (PDF, Revit)
	- Configure Options (optional)
		- Example: Post Material (pine, hardwood, steel), Roof Option (Colorbond, Ultra grade), Screen (rebated front, none)
		- When options are selected, example images and available files update dynamically.
- When a customer completes the stepper form, their data is saved into a custom database table and also sent via email notification.
- See src/stepper-app/* for react js files.

## Admin Order Management App

Built with Tanstack Form to view and manage customer submissions.


## Admin Data Builder App

Allows the admin to create and manage product data (Product Groups, Product Ranges, Individual Products). This data powers the stepper form on the front end. See src/data-builder-app/* for react js files.

