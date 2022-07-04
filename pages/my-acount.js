import { ethers } from 'ethers'
import router, { useRouter } from 'next/router'
import Web3Modal from 'web3modal'
import jwtDecode from 'jwt-decode';
import { useEffect, useState } from 'react'
import Fortmatic from "fortmatic";
import WalletConnectProvider from "@walletconnect/web3-provider";

const BACKEND = 'http://localhost:8000/api'

const LS_KEY = 'pic-metamask:auth';


export default function Home() {
  //const [formInput, updateFormInput] = useState({ name: '', email: ''})
  //const [signature, setSignature] = useState('')
  //const [signer, setSigner] = useState(null)
  //const router = useRouter()
  const [acount, setAcount] = useState('')
  const [loading, setLoading] = useState(true)
  const [setted, setSetted] = useState(false)
  const [authstate, setAuthstate] = useState({});
	const [state, setState] = useState({
		id: '',
    publicAddress:'',
		username: '',
		email: '',
	});

	useEffect(() => {
    initInfo()
	}, []);

  
	useEffect(() => {
    window.ethereum.on("accountsChanged", (accounts) => {
      //console.log(`acount changed => ${accounts}`)
      //console.log(router.asPath)
      if(router.asPath == '/my-acount'){
        initInfo()
      }
    })
	}, []);

  async function initInfo() {
    try{
    
      const web3Modal = new Web3Modal({
        network: "rinkeby",
        cacheProvider: true,
      });
      const connection = await web3Modal.connect()
      const provider = new ethers.providers.Web3Provider(connection)    
      const chainid = await provider.getNetwork()
      console.log(`chainid is ${chainid.chainId}`)
      if(chainid.chainId != 4){
        window.alert('Please change to Rinkeby network.')
        return
      }
      const signer = provider.getSigner()
      const curAcounttmp = await signer.getAddress();
      const curAcount = curAcounttmp.toLocaleLowerCase();
      setAcount(curAcount);


    }catch (err) {

		}
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <p className="text-1xl my-1 font-bold">Current Acount Address: {acount}</p>
      </div>
    </div>
  )
}
