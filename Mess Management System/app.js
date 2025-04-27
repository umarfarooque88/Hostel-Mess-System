// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCEGssXOMc1OoPrEmBqZ9m4rfafucoRxmU",
    authDomain: "sai-mess-system.firebaseapp.com",
    projectId: "sai-mess-system",
    storageBucket: "sai-mess-system.appspot.com",
    messagingSenderId: "377869447912",
    appId: "1:377869447912:web:e31aa46ad0bf419da00f5d"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();



// Function to initialize event listeners
function initEventListeners() {
    // Add event listeners for the sidebar buttons
    document.getElementById('addStudentBtn').addEventListener('click', showAddStudentForm);
    document.getElementById('manageAttendanceBtn').addEventListener('click', showManageAttendance);
}

function updateStatistics() {
    // Get the registered students count
    db.collection("students").get().then((snapshot) => {
        const registeredStudentsCount = snapshot.size; // Total number of registered students
        document.getElementById('registeredStudentsCount').textContent = registeredStudentsCount;
    }).catch((error) => {
        console.error("Error fetching registered students:", error);
    });

    // Get the count of expired meals
    db.collection("students").get().then((snapshot) => {
        let expiredMealsCount = 0;
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.mealsMarked >= 60) { // Changed from 30 to 60
                expiredMealsCount++;
            }
        });
        document.getElementById('expiredMealsCount').textContent = expiredMealsCount;
    }).catch((error) => {
        console.error("Error fetching expired meals count:", error);
    });
}

// Call the updateStatistics function when the dashboard is initialized
updateStatistics();



// Function to show the add student form
function showAddStudentForm() {
    const formContent = `
        <h2>Add New Customer</h2>
        <form id="studentForm">
            <input type="text" id="registrationNumber" placeholder="Registration Number" required>
            <input type="text" id="name" placeholder="Name" required>
            <input type="text" id="mobile" placeholder="Mobile Number" required>
            <input type="text" id="address" placeholder="Address" required>
            <input type="file" id="photo" accept="image/*"> <!-- Make this optional -->
            <input type="text" id="payment" placeholder="Payment" required> <!-- New payment input field -->
            <input type="text" id="registrationDate" placeholder="DD/MM/YYYY" required>

            <button type="submit">Add Customer</button>
            <p id="statusMessage"></p>
        </form>
    `;
    document.getElementById('contentArea').innerHTML = formContent;
    document.getElementById('studentForm').addEventListener('submit', handleStudentFormSubmit);
}



// Function to show manage attendance section
function showManageAttendance() {
    fetchStudents();  // Fetch students to show in the attendance section
}

// Function to fetch and display students
function fetchStudents(searchTerm = "") {
    db.collection("students").orderBy("registrationNumber").get().then((querySnapshot) => {
        let studentTable = `
            <h2>Manage Attendance</h2>
            <input type="text" id="searchBar" placeholder="Search by registration number, name">
            <button id="searchButton">Go</button>
            <div class="table-container">
                <table>
                    <tr>
                        <th>Reg No</th>
                        <th>Photo</th>
                        <th>Name</th>
                        <th>Meals</th>
                        <th>Action</th>
                    </tr>`;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const mealsMarked = data.mealsMarked || 0;
            const registrationNumber = data.registrationNumber; // Use registration number instead of serial number
            const photoUrl = data.photoUrl || 'default-photo.png';


            // Filter search results based on registration number or name
            if (
                registrationNumber.toString().includes(searchTerm) ||
                data.name.toLowerCase().includes(searchTerm.toLowerCase())
            ) {
                studentTable += `
                    <tr class="student-row" data-id="${doc.id}">
                        <td>${registrationNumber}</td>
                        <td><img src="${photoUrl}" alt="${data.name}" style="width:70px; height:70px;"></td>
                        <td>${data.name}</td>
                        <td>${mealsMarked}</td>
                        <td>
                            <button class="markLunchBtn" data-id="${doc.id}" style="width:20%; padding: 15px;">Lunch</button>
                            <button class="markDinnerBtn" data-id="${doc.id}" style="width:20%; padding: 15px;">Dinner</button>
                            <button class="viewStudentBtn" data-id="${doc.id}">View</button>
                        </td>
                    </tr>`;
            }
        });
        studentTable += `</table></div>`;
        document.getElementById('contentArea').innerHTML = studentTable;

        // Add event listeners for viewing and marking meals
        document.querySelectorAll('.viewStudentBtn').forEach(button => {
            button.addEventListener('click', () => viewStudent(button.dataset.id));
        });

        document.querySelectorAll('.markLunchBtn').forEach(button => {
            button.addEventListener('click', () => markMeal(button.dataset.id, "Lunch"));
        });

        document.querySelectorAll('.markDinnerBtn').forEach(button => {
            button.addEventListener('click', () => markMeal(button.dataset.id, "Dinner"));
        });

        // Add search functionality
        document.getElementById('searchButton').addEventListener('click', () => {
            performSearch();
        });

        document.getElementById('searchBar').addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });

        // Function to perform search
        function performSearch() {
            const searchValue = document.getElementById('searchBar').value.toLowerCase();
            const rows = document.querySelectorAll('.student-row');
            rows.forEach(row => {
                const name = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
                const registrationNumber = row.querySelector('td:nth-child(1)').textContent;

                if (name.includes(searchValue) || registrationNumber.includes(searchValue)) {
                    row.style.display = ''; // Show row if it matches
                } else {
                    row.style.display = 'none'; // Hide row if it doesn't match
                }
            });
        }

    }).catch((error) => {
        console.error("Error fetching students:", error);
    });
}





// Function to handle adding a new student
function handleStudentFormSubmit(e) {
    e.preventDefault();  // Prevent form submission
    const registrationNumber = document.getElementById('registrationNumber').value; // Get the input value
    const name = document.getElementById('name').value;
    const mobile = document.getElementById('mobile').value;
    const address = document.getElementById('address').value;
    const photoFile = document.getElementById('photo').files[0];
    
    // Add this line to retrieve the registration date
    const registrationDate = document.getElementById('registrationDate').value;

    // Initialize photo URL variable
    let photoUrl = '';

    // Only upload the photo if a file is selected
    if (photoFile) {
        const storageRef = storage.ref(`student_photos/${photoFile.name}`);
        storageRef.put(photoFile).then(() => {
            return storageRef.getDownloadURL(); // Return the photo URL
        }).then((url) => {
            photoUrl = url; // Store the retrieved photo URL
            addStudentToFirestore(registrationNumber, name, mobile, address, photoUrl, registrationDate); // Pass registrationDate to addStudentToFirestore
        }).catch((error) => {
            console.error("Error uploading photo:", error);
        });
    } else {
        // If no photo is selected, directly add the student without a photo URL
        addStudentToFirestore(registrationNumber, name, mobile, address, photoUrl, registrationDate); // Pass registrationDate to addStudentToFirestore
    }
}



// Helper function to add student to Firestore
function addStudentToFirestore(registrationNumber, name, mobile, address, photoUrl, registrationDate) {
    const payment = document.getElementById('payment').value;  // Get the payment input value
    const newStudent = {
        registrationNumber,
        name,
        mobile,
        address,
        photoUrl: photoUrl || 'default-photo.png',
        mealsMarked: 0,
        registrationDate: registrationDate, // Use the input registration date
        mealHistory: [],
        payment  // Add payment to the student object
    };

    db.collection("students").add(newStudent).then(() => {
        document.getElementById('statusMessage').textContent = "Customer added successfully!";
        document.getElementById('studentForm').reset();
    }).catch((error) => {
        console.error("Error adding student:", error);
        document.getElementById('statusMessage').textContent = "Error adding student.";
    });
}




// Function to delete a student
function deleteStudent(studentId) {
    db.collection("students").doc(studentId).delete().then(() => {
        alert("Student deleted successfully.");
        fetchStudents(); // Refresh the student list
    }).catch((error) => {
        console.error("Error deleting student:", error);
    });
}

// Function to view student details
function viewStudent(studentId) {
    db.collection("students").doc(studentId).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const mealsMarked = data.mealsMarked || 0;
            const photoUrl = data.photoUrl || 'default-photo.png';
            const mealStatus = mealsMarked < 60 ? "Active" : "Meal Limit Reached (Expired)";
            const payment = data.payment || '';

            // Check if registrationDate is a Timestamp, otherwise handle it as a string
            let registrationDate = data.registrationDate;
            if (registrationDate instanceof firebase.firestore.Timestamp) {
                registrationDate = registrationDate.toDate().toLocaleDateString();
            } else {
                registrationDate = registrationDate || 'N/A'; // In case the registration date is not set
            }

            let viewContent = `
                <div class="view-student">
                    <h2>${data.name}'s Details</h2>
                    <img src="${photoUrl}" alt="${data.name}" style="width:100px; height:100px;">
                    <p><strong>Mobile:</strong> ${data.mobile}</p>
                    <p><strong>Meals Marked:</strong> ${mealsMarked} (Status: ${mealStatus})</p>
                    <div>
                        <h3>Registration Date: <span id="regDate">${registrationDate}</span></h3>
                    </div>
                    <input type="text" id="editPayment" placeholder="Payment" value="${payment}"> <!-- Editable payment field -->
                    <button id="savePaymentBtn">Save</button></p> <!-- Save button -->
                    <button id="resetMealsBtn">Reset Meals</button>
                    <button class="deleteStudentBtn" id="deleteStudentBtn">Delete</button>
                    <button class="back-button" onclick="fetchStudents()">Back to List</button>
                    <h3>Meal History</h3>
                    <div class="meal-history">
                        <div class="scrollable-table">
                            <table>
                                <tr>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Meal Type</th>
                                </tr>`;

            const mealHistory = data.mealHistory || [];
            mealHistory.forEach(meal => {
                const formattedDate = formatDate(meal.date);
                viewContent += `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${meal.time}</td>
                        <td>${meal.type}</td>
                    </tr>`;
            });

            viewContent += `</table></div></div></div>`;
            document.getElementById('contentArea').innerHTML = viewContent;

            // Event listener for saving edited payment
            document.getElementById('savePaymentBtn').addEventListener('click', () => {
                const newPayment = document.getElementById('editPayment').value;
                savePayment(studentId, newPayment);
            });

            // Event listener for resetting meals
            document.getElementById('resetMealsBtn').addEventListener('click', () => resetMeals(studentId));

            // Event listener for deleting student
            document.getElementById('deleteStudentBtn').addEventListener('click', () => {
                if (confirm("Are you sure you want to delete this student?")) {
                    deleteStudent(studentId);
                }
            });
        }
    }).catch((error) => {
        console.error("Error fetching student details:", error);
    });
}





// Function to save the edited payment
function savePayment(studentId, newPayment) {
    db.collection("students").doc(studentId).update({
        payment: newPayment
    }).then(() => {
        alert("Payment updated successfully!");
        viewStudent(studentId); // Refresh the view to show updated payment
    }).catch((error) => {
        console.error("Error updating payment:", error);
    });
}





// Function to mark meals
let alertShown = false; // Flag to prevent multiple alerts

// Function to mark meals
function markMeal(studentId, mealType) {
    db.collection("students").doc(studentId).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            let mealsMarked = data.mealsMarked || 0;
            const mealHistory = data.mealHistory || [];

            if (mealsMarked < 60) { // Changed from 30 to 60
                const now = new Date();
                const today = now.toDateString();
                const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

                // Check if meal for today is already marked
                const isMealMarkedToday = mealHistory.some(meal => meal.date.toDate().toDateString() === today && meal.type === mealType);

                if (!isMealMarkedToday) {
                    // Update meal history with date and time
                    mealHistory.push({ date: now, time: time, type: mealType });
                    mealsMarked += 1;

                    // Update Firestore
                    db.collection("students").doc(studentId).update({
                        mealsMarked,
                        mealHistory
                    }).then(() => {
                        // Update the meals marked count in the DOM
                        const studentRow = document.querySelector(`.student-row[data-id='${studentId}']`);
                        const mealsMarkedCell = studentRow.querySelector('td:nth-child(4)'); // Select the "Meals Marked" cell
                        mealsMarkedCell.textContent = mealsMarked; // Update the cell with the new count

                        console.log(`${mealType} marked successfully for today at ${time}!`);
                    }).catch((error) => {
                        console.error("Error marking meal:", error);
                    });
                } else {
                    console.log(`You have already marked ${mealType.toLowerCase()} for today!`);
                }
            } else {
                console.log("Meal limit reached! Cannot mark any more meals.");
            }
        }
    }).catch((error) => {
        console.error("Error fetching student data:", error);
    });
}





/// Function to reset meals and update the registration date
function resetMeals(studentId) {
    const resetDate = new Date(); // Get the current date for reset

    db.collection("students").doc(studentId).update({
        mealsMarked: 0,
        mealHistory: [], // Reset meal history
        registrationDate: resetDate // Update registration date to the reset date
    }).then(() => {
        viewStudent(studentId); // Refresh view without triggering the registration expired alert
    }).catch((error) => {
        console.error("Error resetting meals:", error);
    });
}

// Function to check if registration is expired (max limit 35 days)
function isRegistrationExpired(registrationDate) {
    const currentDate = new Date();
    const registrationTimestamp = registrationDate.toDate(); // Convert Firestore timestamp to JS date
    const timeDifference = currentDate - registrationTimestamp; // Time difference in milliseconds
    const daysPassed = timeDifference / (1000 * 60 * 60 * 24); // Convert milliseconds to days

    // Only check for expiration if meals haven't been reset recently
    if (daysPassed > 35) {
        const formattedDate = registrationTimestamp.toLocaleDateString('en-GB'); // Format the registration date to DD/MM/YYYY
        alert(`35 days limit expired! Registration Date: ${formattedDate}`);
        return true;
    }

    return false;
}




// Helper function to format date to DD/MM/YYYY
function formatDate(date) {
    const d = new Date(date.toDate()); // Convert Firestore timestamp
    let day = d.getDate();
    let month = d.getMonth() + 1; // Months are zero-indexed
    let year = d.getFullYear();

    // Add leading zeros to day and month if necessary
    if (day < 10) day = '0' + day;
    if (month < 10) month = '0' + month;

    return `${day}/${month}/${year}`;
}



// Initialize event listeners
initEventListeners();
