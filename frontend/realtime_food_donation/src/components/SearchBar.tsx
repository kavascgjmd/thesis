import '../styles//SearchBar.css';

const SearchBar = () => {
    return (
        <div className="search-bar">
            <button>📍</button> {/* Location icon */}
            <input type="text" placeholder="Search for restaurant, cuisine or a dish" />
        </div>
    );
};

export default SearchBar;
