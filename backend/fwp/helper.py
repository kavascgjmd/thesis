import pandas as pd
# Define the column headers
columns = [
    'timestamp',
    'type_of_food',
    'number_of_guests',
    'event_type',
    'quantity_of_food',
    'serving_method',
    'geographical_location',
    'pricing',
    'wastage_food_amount',
    'actual_location',
    'name_of_food',
    'model_id'
]

models_schema = [
    'model_id',
    'model_file_name',
    'model_name'
]

# Create an empty DataFrame
if __name__ == "__main__":
    empty_df = pd.DataFrame(columns=columns)

    # Write to an empty CSV file (with headers only)
    empty_df.to_csv('log.csv', index=False)

    empty_df = pd.DataFrame(columns = models_schema)

    empty_df.to_csv('model_list.csv', index = False)
