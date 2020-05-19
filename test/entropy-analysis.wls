#!/usr/bin/env wolframscript
(* ::Package:: *)

(* ::Input:: *)
(*ll=ReadList["build/test/entropy.txt"];*)


(* ::Input:: *)
(*n=Length[ll];*)
(*sp=500;*)
(*st = IntegerPart[ n / sp]*)
(*xx = Range[sp];*)
(*For[i=1,i<=sp,i++,*)
(*s=i*st;*)
(*(*xx[[i]]=ll[[s]];*)*)
(*xx[[i]]={ll[[s]][[2]],ll[[s]][[1]]};*)
(*];*)


(* ::Input:: *)
(*ListPlot[xx]*)


(* ::Input:: *)
(*diff=Table[(xx[[i+1]][[1]]-xx[[i]][[1]])/(xx[[i+1]][[2]]-xx[[i]][[2]])//N,{i,1,Length[xx]-1}]*)


(* ::Input:: *)
(*ListLinePlot[diff]*)


(* ::Input:: *)
(*TrimmedMean[diff]*)



