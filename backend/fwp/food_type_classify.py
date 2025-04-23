from sentence_transformers import SentenceTransformer, util
food_types = ["Baked Goods", "Meat", "Diary Products", "Vegetables", "Fruits"]
def food_type_classify(food_type):


    # Load the pre-trained model
    # model = SentenceTransformer('all-MiniLM-L6-v2')
    model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

    # Enriched category descriptions with example foods
    category_descriptions = {
        "Baked Goods": (
            "Baked Goods include a variety of flour-based items that are cooked using dry heat in ovens. "
            "Examples are soft bread, layered cakes, crunchy cookies, fluffy muffins, and buttery croissants. "
            "These are typically made using ingredients like wheat flour, yeast, sugar, eggs, and butter. "
            "Commonly consumed as breakfast items, desserts, or tea-time snacks in Western-style cuisines."
        ),
        "Dairy Products": (
            "Dairy Products are food items derived from milk. They include paneer (cottage cheese), cheese, ghee (clarified butter), curd (yogurt), cream, and butter. "
            "Sweets like rasmalai, gulab jamun, and kalakand also fall under this category as they are made using condensed milk or khoya. "
            "Dairy is a rich source of calcium and protein, used in both savory and sweet dishes across global cuisines, especially Indian, European, and Middle Eastern."
        ),
        "Fruits": (
            "Fruits are naturally sweet and edible parts of plants that are often consumed raw. "
            "This category includes apples, bananas, mangoes, grapes, oranges, and seasonal varieties like lychee, guava, or pomegranate. "
            "Fruits are rich in vitamins, fiber, and natural sugars. They are typically served as snacks, in salads, desserts, smoothies, or juices. "
            "They are used in global cuisines and are considered light, refreshing, and nutritious."
        ),
        "Meat": (
            "Meat includes edible animal flesh and is a key source of protein in many diets. "
            "Common varieties include chicken, mutton (goat or lamb), beef, pork, and fish. "
            "Used in various preparations like curries, kebabs, biryanis, stews, roasts, and grills. "
            "Often marinated with spices, cooked in tandoors, fryers, or pressure cookers. Widely used in Indian, Middle Eastern, Chinese, and Western cuisines."
        ),
        "Vegetables": (
            "Vegetables are savory plant-based food items, often used in daily meals. "
            "Includes root vegetables like potatoes and carrots, leafy greens like spinach and fenugreek, and others like tomatoes, cucumbers, beans, and bell peppers. "
            "Cooked as stir-fries, curries, gravies, or mixed in rice and roti-based meals. "
            "They are rich in fiber, vitamins, and minerals and are a core part of vegetarian and vegan diets across the world."
        ),
        "South Indian Breakfast": (
            "South Indian Breakfast refers to a variety of light, steamed or fried foods traditionally eaten in southern Indian states like Tamil Nadu, Andhra Pradesh, Karnataka, and Kerala. "
            "Dishes include soft idli, crispy dosa, spicy medu vada, semolina upma, and comforting pongal. "
            "They are typically served hot with accompaniments like coconut chutney, tomato chutney, and sambar (lentil-based soup). "
            "These meals are rich in rice and lentils, prepared using fermentation and steaming methods, and often served on banana leaves in authentic settings."
        ),
        "Snack": (
            "Snacks & Street Food consists of quick, flavorful, and usually spicy items sold by roadside vendors. "
            "Includes samosas, pakoras, golgappa (pani puri), sev puri, pav bhaji, vada pav, chaat, and bhel puri. "
            "Often deep-fried or assembled quickly with chutneys, yogurt, spices, and crispy elements. "
            "Popular in Indian cities, especially during evenings or festivals. These foods are affordable, tasty, and often eaten on-the-go."
        ),
        "Rice and Biryani Dishes": (
            "Rice and Biryani Dishes include a wide variety of rice-based preparations that are central to many Indian and Asian meals. "
            "This category covers plain steamed rice, jeera (cumin) rice, ghee rice, and pulao, as well as more elaborate dishes like biryani and fried rice. "
            "Biryani is a layered, aromatic rice dish made with basmati rice, meat (like chicken, mutton, or fish), or vegetables, along with yogurt, spices, saffron, and fried onions. "
            "Variants include Hyderabadi dum biryani, Kolkata biryani, Lucknowi biryani, and South Indian biryanis. "
            "Often served with raita, salan (gravy), or boiled eggs. These dishes are rich, flavorful, and commonly served during lunch, dinner, or festive occasions."
        )
    }

    # Encode the category descriptions using the pre-trained SentenceTransformer model
    category_names = list(category_descriptions.keys())
    category_descriptions_list = list(category_descriptions.values())
    category_embeddings = model.encode(category_descriptions_list, convert_to_tensor=True)

    # Function to search for the top 5 closest categories for a new food item
    def search_top_categories(new_food_item):
        # Encode the new food item
        new_food_embedding = model.encode(new_food_item, convert_to_tensor=True)

        # Calculate cosine similarity between the new food item and category descriptions
        cosine_scores = util.cos_sim(new_food_embedding, category_embeddings)

        # Get the top 5 categories with the highest cosine similarity
        top_5_indices = cosine_scores.topk(5).indices.tolist()[0]

        # Fetch the top 5 matching categories and their similarity scores
        top_5_matches = [(category_names[i], cosine_scores[0][i].item()) for i in top_5_indices]

        return top_5_matches

    # Example usage:
    new_food_item = food_type
    top_matches = search_top_categories(new_food_item)

    # Display the top 5 matches
    print("Top 5 matches for the food item:", new_food_item)
    for category, score in top_matches:
        if category in food_types:
            print(f"Category: {category} | Similarity Score: {score:.4f}")
            return category

    return None