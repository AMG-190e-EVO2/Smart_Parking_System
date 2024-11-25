from ultralytics import YOLO
import cv2
from ultralytics.utils.plotting import Annotator  # ultralytics.yolo.utils.plotting is deprecated
import time
import firebase_admin
from firebase_admin import credentials, db

# Initialize Firebase
cred = credentials.Certificate("./creds/smart_parking_firebase.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://smart-parking-742a5-default-rtdb.firebaseio.com/'  # Realtime Database
})

# Firebase reference
parking_ref = db.reference('parking_lots/PU_lot')

# Timer for updates
start_time = time.time()

# Load the YOLO model
model = YOLO('lot_detector_v2.pt')

# Load the video
cap = cv2.VideoCapture(1)
cap.set(3, 640)
cap.set(4, 480)

while True:
    _, img = cap.read()
    if img is None:
        break  # Exit if the video ends
    
    # Perform prediction
    results = model.predict(img)

    # Initialize counters for spaces
    spaces_empty = 0
    spaces_occupied = 0

    for r in results:
        annotator = Annotator(img)
        
        boxes = r.boxes
        for box in boxes:
            b = box.xyxy[0]  # Get box coordinates (left, top, right, bottom)
            c = int(box.cls)  # Get class index
            
            # Update counters based on class (adjust class indices based on your model's configuration)
            if model.names[c] == "space-empty":
                color = (0, 255, 0)
                spaces_empty += 1
            elif model.names[c] == "space-occupied":
                color = (0, 0, 255)
                spaces_occupied += 1
            
            # Annotate the box with the label
            annotator.box_label(b, model.names[c], color=color)
        
        img = annotator.result()

    # Display counters on the video frame
    cv2.putText(img, f"Spaces Empty: {spaces_empty}", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    cv2.putText(img, f"Spaces Occupied: {spaces_occupied}", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
    
    # Logging data to firebase
    elapsed_time = time.time() - start_time
    if elapsed_time >= 30:
        parking_data = {
            "total_spaces": spaces_empty + spaces_occupied,
            "spaces_empty": spaces_empty,
            "spaces_occupied": spaces_occupied,
            "last_updated": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        }
        parking_ref.set(parking_data)  # Push data to Firebase
        print("Updated Firebase:", parking_data)
        start_time = time.time()
    

    # Show the video frame with annotations
    cv2.imshow('YOLO V8 Detection', img)
    if cv2.waitKey(1) & 0xFF == ord(' '):  # Press space to exit
        break

cap.release()
cv2.destroyAllWindows()
