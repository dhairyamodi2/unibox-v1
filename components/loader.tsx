import { Rings, TailSpin } from "react-loader-spinner";

export default function Loader() {
    return <TailSpin
        visible={true}
        height="120"
        width="120"
        color="black"
        ariaLabel="rings-loading"
        wrapperStyle={{}}
        wrapperClass=""
    />
}