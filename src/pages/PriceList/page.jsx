import Price from "../../assets/pricelist.jpg";
import MainLayout from "../../layouts/MainLayout";

const PriceList = () => {
  return (
    <MainLayout>
      {" "}
      <h1 className="text-2xl font-medium">Price List</h1>
      <div className="my-2">
        <img
          src={Price}
          width={900}
          height={854}
          alt="price list"
          className="rounded-xl"
          loading="lazy"
          decoding="async"
        />
      </div>
    </MainLayout>
  );
};

export default PriceList;
