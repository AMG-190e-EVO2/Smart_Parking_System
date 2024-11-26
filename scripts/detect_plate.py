from ultralytics import YOLO
import cv2
import numpy as np

from sort.sort import *
from util import get_car, read_license_plate

from datetime import datetime
import firebase_admin
from firebase_admin import credentials, db

# Firebase setup
cred = credentials.Certificate("./creds/smart_parking_firebase.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://smart-parking-742a5-default-rtdb.firebaseio.com/'
})

# Reference to the path
parking_ref = db.reference('/parking_lots/PU_lot/entry_log/')  # Firebase database reference

# Helper function to get current date
def get_current_date():
    return datetime.now().strftime('%Y-%m-%d')

# Helper function to log vehicle data
def log_vehicle_data(license_plate_text, gate_type):
    current_date = get_current_date()  # Get today's date
    now = datetime.now().strftime('%H:%M')  # Current time

    # Reference to today's parking data
    date_ref = parking_ref.child(current_date)

    if gate_type == 'entry':
        # Log entry time if not already recorded
        if not date_ref.child(license_plate_text).get():
            date_ref.child(license_plate_text).set({
                'entry_time': now,
                'exit_time': "NULL"
            })
            print(f"Vehicle {license_plate_text} entered at {now}")
    elif gate_type == 'exit':
        # Log exit time if entry exists and exit is not yet recorded
        vehicle_data = date_ref.child(license_plate_text).get()
        if vehicle_data and vehicle_data.get('exit_time')=="NULL":
            date_ref.child(license_plate_text).update({
                'exit_time': now
            })
            print(f"Vehicle {license_plate_text} exited at {now}")


# Load models
coco_model = YOLO('yolov8n.pt')
coco_model.to('cuda')
license_plate_detector = YOLO('license_plate_detector.pt')


# Load videos (entry and exit gates)
cap_entry = cv2.VideoCapture('./dataset/entry_sample.mp4')
cap_exit = cv2.VideoCapture('./dataset/exit_sample.mp4')

# Vehicle classes
vehicles = [2, 3, 5, 7]  # Define vehicle classes as per your dataset
mot_tracker = Sort()  # Object tracker


# Function to process a frame
def process_frame(frame, gate_type):
    detections = coco_model(frame)[0]
    detections_ = []
    for detection in detections.boxes.data.tolist():
        x1, y1, x2, y2, score, class_id = detection
        if int(class_id) in vehicles:
            detections_.append([x1, y1, x2, y2, score])

    # Track vehicles
    track_ids = mot_tracker.update(np.asarray(detections_))

    # Detect license plates
    license_plates = license_plate_detector(frame)[0]
    for license_plate in license_plates.boxes.data.tolist():
        x1, y1, x2, y2, score, class_id = license_plate

        # Assign license plate to car
        xcar1, ycar1, xcar2, ycar2, car_id = get_car(license_plate, track_ids)

        if car_id != -1:
            # Crop license plate
            license_plate_crop = frame[int(y1):int(y2), int(x1): int(x2), :]

            # Process license plate
            license_plate_crop_gray = cv2.cvtColor(license_plate_crop, cv2.COLOR_BGR2GRAY)
            _, license_plate_crop_thresh = cv2.threshold(license_plate_crop_gray, 64, 255, cv2.THRESH_BINARY_INV)

            # Read license plate number
            license_plate_text, license_plate_text_score = read_license_plate(license_plate_crop_thresh)

            if license_plate_text is not None:
                log_vehicle_data(license_plate_text, gate_type)


# Main loop to process entry and exit gates
while True:
    # Process entry gate
    ret_entry, frame_entry = cap_entry.read()
    if ret_entry:
        process_frame(frame_entry, 'entry')

        # Display entry gate frame
        resized_entry_frame = cv2.resize(frame_entry, (640, 480))
        cv2.imshow('Entry Gate', resized_entry_frame)

    # Process exit gate
    ret_exit, frame_exit = cap_exit.read()
    if ret_exit:
        process_frame(frame_exit, 'exit')

        # Display exit gate frame
        resized_exit_frame = cv2.resize(frame_exit, (640, 480))
        cv2.imshow('Exit Gate', resized_exit_frame)

    # To break the loop
    key = cv2.waitKey(1)
    if key & 0xFF == ord('q') or key == 27:
        break

# Release resources
cap_entry.release()
cap_exit.release()
cv2.destroyAllWindows()
