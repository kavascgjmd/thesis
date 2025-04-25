from sklearn.feature_extraction.text import TfidfVectorizer
from category_descriptions import category_descriptions

# Global vectorizer and vector space
vectorizer = TfidfVectorizer()
category_keys = list(category_descriptions.keys())
category_texts = list(category_descriptions.values())
category_vectors = vectorizer.fit_transform(category_texts)

def get_vectorizer():
    return vectorizer

def get_category_vectors():
    return category_vectors

def get_category_keys():
    return category_keys
