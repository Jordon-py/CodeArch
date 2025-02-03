# **CodeArch**
**Where Code Lives**

## **Overview**
CodeArch is a simple application for storing and managing code snippets. It includes user authentication, basic CRUD operations for snippets, and a straightforward interface built with Node.js, Express, and EJS.

## **Features**
- **User Authentication:** Secure session-based sign-in/sign-out.
- **Snippet Management:** Create, view, and delete code snippets.
- **Dashboard:** Displays saved snippets for each user.
- **UI Elements:** Includes a gold wave section and a basic shimmering text effect.

## **Installation**
1. **Clone the repo:**
   ```bash
   git clone https://github.com/your-username/codearch.git
   cd codearch
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Create a `.env` file:**
   ```
   MONGODB_URI=mongodb://localhost:27017/codearchdb
   SESSION_SECRET=supersecret
   PORT=3000
   ```
4. **Run the server:**
   ```bash
   npm start
   ```
Access the app at **http://localhost:3000**.

## **Usage**
1. **Sign In/Sign Up:**  
   Navigate to `/auth/sign-up` or `/auth/sign-in`.
2. **Dashboard:**  
   Create snippets, view existing ones, and delete any you no longer need.

## **Technologies**
- Node.js & Express
- Mongoose (MongoDB)
- EJS templating
- Express-session & method-override


## **Future Ideas**

- **Snippet Sharing**: Generate shareable links or a VIP lounge for advanced snippet collaboration.

## **Contributing**
Feel free to fork this repository, open issues, or submit pull requests with features, fixes, or improvements.

## **License**
Distributed under the MIT License. 


**Thank you for checking out CodeArch.** I hope my Code Archive enhances your coding experience!
