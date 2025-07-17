import './style.scss'
function LoadingCards( {card = 3} ) {
  return (
    <div className="loading-cards-container">
        {Array(card).fill(0).map((_, index) => (
            <div key={index} className="loading-card"></div>
        ))}

    </div>
  );
}export default LoadingCards;