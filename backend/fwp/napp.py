import pandas as pd
import joblib
import sys
import json
import os
from food_type_classify import food_type_classify
from food_type_cv import match_food_item  # Add this import

def predict_food_waste(event_data):
    """
    Predict food waste based on event data
    
    Parameters:
    event_data (dict): Event data containing details like event_type, food_type, etc.
    
    Returns:
    float: Predicted food waste in kg
    """
    try:
        # Print received event data for debugging
        print("Received event data:", json.dumps(event_data, indent=2), file=sys.stderr)
        
        # Get the directory of the current script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Load model and data with absolute paths
        model = joblib.load(os.path.join(script_dir, "rf.pkl"))
        poly_model = joblib.load(os.path.join(script_dir, "pol.pkl"))  # Add polynomial model
        input_columns = joblib.load(os.path.join(script_dir, "input_columns.pkl"))
        df = pd.read_csv(os.path.join(script_dir, "df_preprocessed.csv"))
        
        print("Model input columns:", input_columns, file=sys.stderr)
        
        # Automatically detect categorical and numerical columns (excluding target)
        target = 'wastage_food_amount'
        features = [col for col in df.columns if col != target]
        categorical = df[features].select_dtypes(include=['object']).columns.tolist()
        numerical = df[features].select_dtypes(exclude=['object']).columns.tolist()
        
        print("Categorical columns:", categorical, file=sys.stderr)
        print("Numerical columns:", numerical, file=sys.stderr)
        
        # Create a dictionary to store input values
        input_data = {}
        
        # Fill numerical features with mean values as defaults
        for col in numerical:
            input_data[col] = float(df[col].mean())
        
        # Map specific fields from frontend to model inputs
        # IMPORTANT: These mappings must match exactly what the model expects
        if 'number_of_guests' in event_data:
            input_data['number_of_guests'] = event_data['number_of_guests']
        
        # Changed from total_quantity to quantity_of_food to match app.py
        if 'quantity_of_food' in event_data:
            input_data['quantity_of_food'] = event_data['quantity_of_food']
        elif 'total_quantity' in event_data:  # Backward compatibility
            input_data['quantity_of_food'] = event_data['total_quantity']

        if 'preparation_method' in event_data:
            input_data['serving_method'] = event_data['preparation_method']

        if 'pricing' in event_data:
            input_data['pricing'] = event_data['pricing']
        
        # Fill categorical features with first value as defaults
        for col in categorical:
            if col == "type_of_food" and 'name_of_food' in event_data:
                # Updated to use match_food_item like in app.py
                matched_category, score = match_food_item(event_data['name_of_food'])
                input_data["type_of_food"] = matched_category
                print(f"✅ Best matched category: {matched_category} (score: {score:.3f})", file=sys.stderr)
            elif col == "type_of_food" and 'food_type' in event_data:
                # Backward compatibility with old 'food_type'
                input_data["type_of_food"] = food_type_classify(event_data['food_type'])
            else:
                # Default to first value
                input_data[col] = df[col].dropna().unique()[0]
        
        # Map event_type from frontend to model's expected values
        if 'event_type' in event_data:
            # Convert from enum format (like 'Wedding') to lowercase ('wedding')
            event_type = event_data['event_type'].lower()
            input_data['event_type'] = event_type
        
        # Use the location_type from the location classification
        if 'geographical_location' in event_data:
            input_data['geographical_location'] = event_data['geographical_location'].lower()
        elif 'location_type' in event_data:  # Backward compatibility
            input_data['geographical_location'] = event_data['location_type'].lower()
        else:
            # Default location if not provided
            input_data['geographical_location'] = 'urban'
        
        # Create combo columns
        input_data['event_food_combo'] = input_data['event_type'] + '_' + input_data['type_of_food']
        input_data['event_geo_combo'] = input_data['event_type'] + '_' + input_data['geographical_location']
        
        # Print the prepared input data for debugging
        print("Prepared input data:", json.dumps(input_data, default=str, indent=2), file=sys.stderr)
        
        # Convert to DataFrame and encode
        input_df = pd.DataFrame([input_data])
        
        # Create polynomial model input (matching app.py)
        poly_df = pd.DataFrame([[input_data['number_of_guests'], input_data['quantity_of_food']]], 
                             columns=['number_of_guests', 'quantity_of_food'])
        
        print("Input DataFrame before encoding:", file=sys.stderr)
        print(input_df.to_string(), file=sys.stderr)
        
        input_encoded = pd.get_dummies(input_df)
        input_encoded.columns = [col.replace(' ', '_').lower() for col in input_encoded.columns]
        
        print("Encoded DataFrame columns:", input_encoded.columns.tolist(), file=sys.stderr)
        
        # Make sure all columns from model's training are in the input data
        missing_cols = []
        for col in input_columns:
            if col not in input_encoded.columns:
                input_encoded[col] = 0
                missing_cols.append(col)
        
        if missing_cols:
            print(f"Added missing columns: {missing_cols}", file=sys.stderr)
        
        # Ensure columns are in the right order
        input_encoded = input_encoded[input_columns]
        
        print(f"Final input shape: {input_encoded.shape}", file=sys.stderr)
        
        # Predict - add model selection logic from app.py
        pred = model.predict(input_encoded)[0]
        model_id = 0
        
        # Model selection logic from app.py
        if (input_data['number_of_guests'] < 200 or input_data['number_of_guests'] > 500
            or input_data['quantity_of_food'] < 250.0 or input_data['quantity_of_food'] > 550.0):
            pred = poly_model.predict(poly_df)[0]
            model_id = 1
            
        print(f"Prediction result: {pred} (model_id: {model_id})", file=sys.stderr)
        return float(pred)
        
    except Exception as e:
        print(f"Error in prediction: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return None

if __name__ == "__main__":
    try:
        # Read JSON input from command line argument
        if len(sys.argv) < 2:
            raise ValueError("No input JSON provided")
            
        input_json = sys.argv[1]
        event_data = json.loads(input_json)
        
        # Make prediction
        predicted_waste = predict_food_waste(event_data)
        
        if predicted_waste is None:
            raise ValueError("Prediction failed")
        
        # Return result as JSON with proper formatting
        result = {"predicted_waste_kg": round(predicted_waste, 2)}
        print(json.dumps(result))
        sys.stdout.flush()  # Ensure output is sent immediately
        
    except json.JSONDecodeError:
        error_result = {"error": "Invalid JSON input", "predicted_waste_kg": 0}
        print(json.dumps(error_result))
        
    except Exception as e:
        # Handle any exceptions and return valid JSON
        error_result = {"error": str(e), "predicted_waste_kg": 0}
        print(json.dumps(error_result))
        sys.stdout.flush()  # Ensure output is sent immediately