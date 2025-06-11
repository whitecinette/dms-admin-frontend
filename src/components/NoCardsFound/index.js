import "./style.scss";

const NoCardsFound = ({ icon, text }) => {
  return (
    <div className="NoCardsFound">
      <div className="NoCardsFound-content">
        {icon}
        <div>{text}</div>
      </div>
    </div>
  );
};
export default NoCardsFound;
