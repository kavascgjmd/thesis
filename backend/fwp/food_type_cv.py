from sklearn.metrics.pairwise import cosine_similarity
from vectorizer import get_vectorizer, get_category_vectors, get_category_keys

def match_food_item(food_item):
    vectorizer = get_vectorizer()
    category_vectors = get_category_vectors()
    category_keys = get_category_keys()

    item_vector = vectorizer.transform([food_item])
    similarities = cosine_similarity(item_vector, category_vectors).flatten()
    best_match_index = similarities.argmax()
    return category_keys[best_match_index], similarities[best_match_index]
