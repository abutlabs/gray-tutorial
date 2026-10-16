import DefaultTheme from "vitepress/theme";
import { useRoute, type Theme } from "vitepress";
import { h, onMounted, watch } from "vue";
import { listenForKeys, revealActiveLesson } from "./keys.ts";
import { listenForZoom, makePicturesFocusable } from "./zoom.ts";
import { listenForResize, placeSideArrows } from "./side-arrows.ts";
import { reloadOnStaleBuild } from "./stale.ts";
import { listenForSnippetTaps } from "./concepts.ts";
import { listenForEyeTaps } from "./eye.ts";
import ConceptsToggle from "./ConceptsToggle.vue";
import BitPlaces from "./BitPlaces.vue";
import CompactNatural from "./CompactNatural.vue";
import TwoBytes from "./TwoBytes.vue";
import HexByte from "./HexByte.vue";
import BitsAndBytes from "./BitsAndBytes.vue";
import FixedWidth from "./FixedWidth.vue";
import VectorMap from "./VectorMap.vue";
import CoreBitfield from "./CoreBitfield.vue";
import AssuranceGrid from "./AssuranceGrid.vue";
import TrieBuilder from "./TrieBuilder.vue";
import StateKeyWeave from "./StateKeyWeave.vue";
import MountainBelt from "./MountainBelt.vue";
import VerdictVotes from "./VerdictVotes.vue";
import ReportLife from "./ReportLife.vue";
import GuarantorSeats from "./GuarantorSeats.vue";
import CheckpointRun from "./CheckpointRun.vue";
import ReadyQueue from "./ReadyQueue.vue";
import SafroleEpoch from "./SafroleEpoch.vue";
import AuthorizerPool from "./AuthorizerPool.vue";
import PvmStepper from "./PvmStepper.vue";
import PipelineCycles from "./PipelineCycles.vue";
import GasMeter from "./GasMeter.vue";
import ImportWaves from "./ImportWaves.vue";
import ResultTag from "./ResultTag.vue";
import ShardRebuild from "./ShardRebuild.vue";
import HashAvalanche from "./HashAvalanche.vue";
import ExtrinsicCommit from "./ExtrinsicCommit.vue";
import SignCheck from "./SignCheck.vue";
import HeaderMap from "./HeaderMap.vue";
import NumberKinds from "./NumberKinds.vue";
import ReaderWalk from "./ReaderWalk.vue";
import CodecPicker from "./CodecPicker.vue";
import RecordSwap from "./RecordSwap.vue";
import TraceShift from "./TraceShift.vue";
import VoteCount from "./VoteCount.vue";
import MaybeExactly from "./MaybeExactly.vue";
import BlockStrip from "./BlockStrip.vue";
import HashChain from "./HashChain.vue";
import ValidatorKeyMap from "./ValidatorKeyMap.vue";
import EpochTurn from "./EpochTurn.vue";
import ShuffleSteps from "./ShuffleSteps.vue";
import EntropyStairs from "./EntropyStairs.vue";
import Rotation from "./Rotation.vue";
import LotteryClose from "./LotteryClose.vue";
import OutsideIn from "./OutsideIn.vue";
import TicketRules from "./TicketRules.vue";
import SealCheck from "./SealCheck.vue";
import Offenders from "./Offenders.vue";
import RecentBlocks from "./RecentBlocks.vue";
import VerdictRules from "./VerdictRules.vue";
import FaultRule from "./FaultRule.vue";
import AssuranceRules from "./AssuranceRules.vue";
import GuaranteeWindow from "./GuaranteeWindow.vue";
import ReportAnchor from "./ReportAnchor.vue";
import ProvidePreimage from "./ProvidePreimage.vue";
import ServiceRecord from "./ServiceRecord.vue";
import Footprint from "./Footprint.vue";
import BlobLayers from "./BlobLayers.vue";
import DecodeInstruction from "./DecodeInstruction.vue";
import MemoryTouch from "./MemoryTouch.vue";
import StoreLoad from "./StoreLoad.vue";
import AluCorners from "./AluCorners.vue";
import CallTable from "./CallTable.vue";
import SignedBranches from "./SignedBranches.vue";
import BitCounts from "./BitCounts.vue";
import YLayout from "./YLayout.vue";
import SlotClock from "./SlotClock.vue";
import WorkPackage from "./WorkPackage.vue";
import WorkDigest from "./WorkDigest.vue";
import WorkReport from "./WorkReport.vue";
import CheckYourself from "./CheckYourself.vue";
import UnitText from "./UnitText.vue";
import PartFlow from "./PartFlow.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  // the concepts-only switch at the top of every lesson (concepts.ts)
  Layout: () => h(DefaultTheme.Layout, null, { "doc-before": () => h(ConceptsToggle) }),
  enhanceApp({ app, router }) {
    // the lessons' widgets, placed in a lesson as <HexByte /> and so on (WRITING.md, Interactive)
    app.component("PartFlow", PartFlow); // every Part's opening page
    app.component("HexByte", HexByte); // 1.1
    app.component("BitsAndBytes", BitsAndBytes); // 1.1
    app.component("FixedWidth", FixedWidth); // 2.1
    app.component("BitPlaces", BitPlaces); // 2.2
    app.component("TwoBytes", TwoBytes); // 2.2
    app.component("CompactNatural", CompactNatural); // 2.2
    app.component("VectorMap", VectorMap); // 2.6
    app.component("ResultTag", ResultTag); // 3.2
    app.component("ShardRebuild", ShardRebuild); // 3.3
    app.component("CoreBitfield", CoreBitfield); // 4.2
    app.component("SlotClock", SlotClock); // 0.4
    app.component("NumberKinds", NumberKinds); // 1.2
    app.component("ReaderWalk", ReaderWalk); // 2.3
    app.component("CodecPicker", CodecPicker); // 2.4
    app.component("RecordSwap", RecordSwap); // 2.5
    app.component("TraceShift", TraceShift); // 2.7
    app.component("VoteCount", VoteCount); // 4.4
    app.component("MaybeExactly", MaybeExactly); // 4.5
    app.component("BlockStrip", BlockStrip); // 4.7
    app.component("HashChain", HashChain); // 5.1
    app.component("ValidatorKeyMap", ValidatorKeyMap); // 6.3
    app.component("EpochTurn", EpochTurn); // 7.1
    app.component("ShuffleSteps", ShuffleSteps); // 7.2
    app.component("EntropyStairs", EntropyStairs); // 8.1
    app.component("Rotation", Rotation); // 8.2
    app.component("LotteryClose", LotteryClose); // 8.4
    app.component("OutsideIn", OutsideIn); // 8.4
    app.component("TicketRules", TicketRules); // 8.7
    app.component("SealCheck", SealCheck); // 8.9
    app.component("RecentBlocks", RecentBlocks); // 9.2
    app.component("Offenders", Offenders); // 10.2
    app.component("VerdictRules", VerdictRules); // 10.4
    app.component("FaultRule", FaultRule); // 10.5
    app.component("AssuranceRules", AssuranceRules); // 11.3
    app.component("GuaranteeWindow", GuaranteeWindow); // 12.4
    app.component("ReportAnchor", ReportAnchor); // 12.5
    app.component("ProvidePreimage", ProvidePreimage); // 14.1
    app.component("ServiceRecord", ServiceRecord); // 14.2
    app.component("Footprint", Footprint); // 14.2
    app.component("BlobLayers", BlobLayers); // 15.1
    app.component("DecodeInstruction", DecodeInstruction); // 15.2
    app.component("MemoryTouch", MemoryTouch); // 15.4
    app.component("StoreLoad", StoreLoad); // 15.4
    app.component("AluCorners", AluCorners); // 15.5
    app.component("SignedBranches", SignedBranches); // 15.6
    app.component("CallTable", CallTable); // 15.6
    app.component("BitCounts", BitCounts); // 15.7
    app.component("YLayout", YLayout); // 15.8
    app.component("WorkPackage", WorkPackage); // 3.1
    app.component("WorkDigest", WorkDigest); // 3.2
    app.component("WorkReport", WorkReport); // 3.3
    app.component("HeaderMap", HeaderMap); // 4.6
    app.component("HashAvalanche", HashAvalanche); // 5.1
    app.component("ExtrinsicCommit", ExtrinsicCommit); // 5.2
    app.component("SignCheck", SignCheck); // 5.3
    app.component("TrieBuilder", TrieBuilder); // 6.1
    app.component("StateKeyWeave", StateKeyWeave); // 6.2
    app.component("SafroleEpoch", SafroleEpoch); // 8.5
    app.component("MountainBelt", MountainBelt); // 9.1
    app.component("VerdictVotes", VerdictVotes); // 10.1
    app.component("AssuranceGrid", AssuranceGrid); // 11.1
    app.component("ReportLife", ReportLife); // 11.2
    app.component("GuarantorSeats", GuarantorSeats); // 12.1
    app.component("AuthorizerPool", AuthorizerPool); // 13.1
    app.component("PvmStepper", PvmStepper); // 15.3
    app.component("PipelineCycles", PipelineCycles); // 15.10
    app.component("GasMeter", GasMeter); // 15.11
    app.component("CheckpointRun", CheckpointRun); // 16.6
    app.component("ReadyQueue", ReadyQueue); // 17.2
    app.component("ImportWaves", ImportWaves); // 19.1
    // a lesson's understanding check, from its ::: check block (../checks.ts)
    app.component("CheckYourself", CheckYourself);
    app.component("UnitText", UnitText); // the widgets' sentences, their bits and bytes in colour (units.ts)
    if (typeof window === "undefined") return;
    reloadOnStaleBuild();
    listenForSnippetTaps();
    listenForEyeTaps();
    listenForKeys();
    listenForZoom();
    listenForResize();
    router.onAfterRouteChange = () => { revealActiveLesson(); };
  },
  setup() {
    const route = useRoute();
    onMounted(() => {
      revealActiveLesson();
      makePicturesFocusable();
      placeSideArrows();
    });
    // after each new page is in the DOM
    watch(() => route.path, () => {
      makePicturesFocusable();
      placeSideArrows();
    }, { flush: "post" });
  },
} satisfies Theme;
